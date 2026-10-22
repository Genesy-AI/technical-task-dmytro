import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { api } from '../api'
import { LeadsList } from './LeadsList'

vi.mock('../api', () => ({ api: { leads: { getMany: vi.fn(), verifyEmails: vi.fn() } } }))
vi.mock('./MessageTemplateModal', () => ({ MessageTemplateModal: () => null }))
vi.mock('./CsvImportModal', () => ({ CsvImportModal: () => null }))
vi.mock('react-hot-toast', () => ({
  default: { loading: vi.fn(() => 'loading'), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

let host: HTMLDivElement
let root: Root
let client: QueryClient
const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}
const button = (text: string) =>
  Array.from(host.querySelectorAll('button')).find((item) => item.textContent?.includes(text))!

beforeEach(async () => {
  vi.clearAllMocks()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.mocked(api.leads.getMany).mockResolvedValue([
    {
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      createdAt: '',
      updatedAt: '',
      emailVerified: null,
      jobTitle: null,
      countryCode: null,
      companyName: null,
      message: null,
    },
  ])
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root.render(React.createElement(QueryClientProvider, { client }, React.createElement(LeadsList)))
  )
  await flush()
  await act(async () => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click())
  await act(async () => button('Enrich').click())
})

afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
})

describe('email verification feedback', () => {
  it('blocks repeated clicks, reports mixed outcomes, and refreshes saved results', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof api.leads.verifyEmails>>) => void
    vi.mocked(api.leads.verifyEmails).mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    await act(async () => button('Verify Email').click())
    await flush()
    expect(toast.loading).toHaveBeenCalledOnce()
    expect(button('Verifying')).toBeDisabled()
    await act(async () => button('Verifying').click())
    expect(api.leads.verifyEmails).toHaveBeenCalledTimes(1)
    await act(async () =>
      resolve({
        success: true,
        verifiedCount: 2,
        results: [
          { leadId: 2, emailVerified: true },
          { leadId: 3, emailVerified: false },
        ],
        errors: [{ leadId: 1, leadName: 'Jane Smith', error: 'Verification timed out.' }],
      })
    )
    await flush()
    expect(toast.success).toHaveBeenCalledWith('1 valid, 1 invalid, 1 check failed.')
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Jane Smith: Verification timed out.'))
    expect(toast.dismiss).toHaveBeenCalledWith('loading')
    expect(api.leads.getMany).toHaveBeenCalledTimes(2)
    await act(async () => button('Enrich').click())
    expect(button('Verify Email')).not.toBeDisabled()
  })

  it('cleans up after a lost response without claiming every check failed', async () => {
    vi.mocked(api.leads.verifyEmails).mockRejectedValue(new Error('network lost'))
    await act(async () => button('Verify Email').click())
    await flush()
    expect(toast.error).toHaveBeenCalledWith(
      'Could not confirm verification results. Refresh the table before retrying.'
    )
    expect(toast.dismiss).toHaveBeenCalledWith('loading')
    expect(api.leads.getMany).toHaveBeenCalledTimes(2)
    expect(button('Verify Email')).not.toBeDisabled()
  })
})
