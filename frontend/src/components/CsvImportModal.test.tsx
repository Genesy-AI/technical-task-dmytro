import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { CsvImportModal } from './CsvImportModal'

vi.mock('../api', () => ({ api: { leads: { bulkImport: vi.fn() } } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
let host: HTMLDivElement
let root: Root
let client: QueryClient
const onClose = vi.fn()
const button = (text: string) =>
  Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.includes(text))!
const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30))
  })
}
const upload = async (csv: string) => {
  const input = document.querySelector('input[type="file"]')!
  Object.defineProperty(input, 'files', { configurable: true, value: [new File([csv], 'leads.csv')] })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
  await flush()
}
const result = {
  success: true,
  importedCount: 1,
  duplicatesSkipped: 0,
  invalidLeads: 0,
  errors: [],
  warnings: [],
}
const csv = 'firstName,lastName,email,countryCode\nMissing,,m@example.com,US\n\nJane,Doe,j@example.com,XXX'

beforeEach(async () => {
  vi.clearAllMocks()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <CsvImportModal isOpen onClose={onClose} />
      </QueryClientProvider>
    )
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
})

describe('CSV country feedback', () => {
  it('keeps a warned lead importable and maps server feedback back to its physical source row', async () => {
    vi.mocked(api.leads.bulkImport).mockResolvedValue({
      ...result,
      warnings: [
        {
          inputIndex: 0,
          field: 'countryCode',
          message: "invalid country code 'XXX'; imported without country.",
        },
      ],
    })
    await upload(csv)
    expect(document.body.textContent).toContain('will import without country')
    expect(document.body.textContent).toContain('–')
    expect(button('Import 1 Valid Leads')).not.toBeDisabled()
    await act(async () => button('Import 1 Valid Leads').click())
    await flush()
    expect(api.leads.bulkImport).toHaveBeenCalledWith({
      leads: [expect.objectContaining({ countryCode: 'XXX' })],
    })
    expect(document.body.textContent).toContain(
      "Row 4: invalid country code 'XXX'; imported without country."
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(button('Import complete')).toBeDisabled()
    await act(async () => button('Import complete').click())
    expect(api.leads.bulkImport).toHaveBeenCalledTimes(1)
  })

  it('does not claim a duplicate with an invalid country was imported', async () => {
    vi.mocked(api.leads.bulkImport).mockResolvedValue({ ...result, importedCount: 0, duplicatesSkipped: 1 })
    await upload('firstName,lastName,email,countryCode\nJane,Doe,j@example.com,XXX')
    await act(async () => button('Import 1 Valid Leads').click())
    await flush()
    expect(document.body.textContent).not.toContain('imported without country')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps persistence errors readable without marking them as successful imports', async () => {
    vi.mocked(api.leads.bulkImport).mockResolvedValue({
      ...result,
      importedCount: 0,
      errors: [{ inputIndex: 0, lead: { firstName: 'Jane', lastName: 'Doe' }, error: 'Save failed' }],
    })
    await upload(csv)
    await act(async () => button('Import 1 Valid Leads').click())
    await flush()
    expect(document.body.textContent).toContain('Row 4: Save failed')
    expect(document.body.textContent).not.toContain('imported without country')
    expect(button('Import complete')).toBeDisabled()
  })

  it('restores the action after a request error', async () => {
    vi.mocked(api.leads.bulkImport).mockRejectedValue(new Error('offline'))
    await upload(csv)
    await act(async () => button('Import 1 Valid Leads').click())
    await flush()
    expect(button('Import 1 Valid Leads')).not.toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
