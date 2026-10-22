import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { api } from '../api'
import { CsvImportModal } from './CsvImportModal'

vi.mock('../api', () => ({ api: { leads: { bulkImport: vi.fn() } } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

it('previews new fields, excludes invalid rows, and sends zero and phone strings', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient()
  const onClose = vi.fn()
  let payload: unknown
  vi.mocked(api.leads.bulkImport).mockImplementation(async (input) => {
    payload = input
    return { success: true, importedCount: 1, duplicatesSkipped: 0, invalidLeads: 0, errors: [] }
  })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CsvImportModal isOpen onClose={onClose} />
        </QueryClientProvider>
      )
    )
    const input = document.querySelector('input[type="file"]')!
    const csv =
      'firstName,lastName,email,phoneNumber,yearsAtCompany,linkedinUrl\nAda,Lovelace,ada@example.com,+44 (20) 001 x5,0,https://linkedin.com/in/ada\nBad,Years,bad@example.com,,101,'
    Object.defineProperty(input, 'files', { value: [new File([csv], 'fields.csv')] })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    expect(document.body.textContent).toContain('+44 (20) 001 x5')
    expect(document.body.textContent).toContain('yearsAtCompany must be a whole number from 0 to 100')
    const button = Array.from(document.querySelectorAll('button')).find(
      (item) => item.textContent === 'Import 1 Valid Leads'
    )!
    await act(async () => button.click())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(payload).toMatchObject({
      leads: [
        {
          firstName: 'Ada',
          phoneNumber: '+44 (20) 001 x5',
          yearsAtCompany: 0,
          linkedinUrl: 'https://linkedin.com/in/ada',
        },
      ],
    })
    expect(onClose).toHaveBeenCalledOnce()
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})
