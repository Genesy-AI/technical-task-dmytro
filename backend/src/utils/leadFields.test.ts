import { describe, expect, it } from 'vitest'
import { generateMessageFromTemplate } from './messageGenerator'

describe('new template fields', () => {
  const lead = {
    firstName: 'Ada',
    phoneNumber: '+44 (20) 123 x5',
    yearsAtCompany: 0,
    linkedinUrl: 'https://linkedin.com/in/ada?x=$&',
  }
  it('substitutes all three fields including zero literally', () => {
    expect(
      generateMessageFromTemplate('{phoneNumber} {yearsAtCompany} {linkedinUrl} {yearsAtCompany}', lead)
    ).toBe('+44 (20) 123 x5 0 https://linkedin.com/in/ada?x=$& 0')
  })
  it.each(['phoneNumber', 'yearsAtCompany', 'linkedinUrl'])('rejects referenced missing %s', (field) => {
    expect(() => generateMessageFromTemplate(`{${field}}`, { firstName: 'Ada' })).toThrow(
      `Missing required field: ${field}`
    )
  })
  it('allows unreferenced missing fields', () => {
    expect(generateMessageFromTemplate('{firstName}', { firstName: 'Ada' })).toBe('Ada')
  })
})
