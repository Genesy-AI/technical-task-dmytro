import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { MessageTemplateModal } from './MessageTemplateModal'

vi.mock('../api', () => ({ api: { leads: { generateMessages: vi.fn() } } }))

it('filters fields and inserts at the saved selection with focus restored', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient()
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MessageTemplateModal isOpen onClose={() => {}} selectedLeadIds={[1]} selectedLeadsCount={1} />
        </QueryClientProvider>
      )
    )
    const textarea = document.querySelector('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        textarea,
        'Hello PERSON!'
      )
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.setSelectionRange(6, 12)
      textarea.dispatchEvent(new Event('select', { bubbles: true }))
    })
    const search = document.querySelector<HTMLInputElement>('#template-field-search')
    expect(search).not.toBeNull()
    await act(async () => {
      textarea.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      search!.focus()
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'years')
      search!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const fieldButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-template-field]'))
    expect(fieldButtons.map((button) => button.dataset.templateField)).toEqual(['yearsAtCompany'])
    await act(async () => {
      fieldButtons[0].focus()
      fieldButtons[0].click()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(textarea.value).toBe('Hello {yearsAtCompany}!')
    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionStart).toBe(22)
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})
