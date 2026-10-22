import { describe, expect, it } from 'vitest'
import { normalizeLeadFields } from './leadFields'

describe('lead field boundary validation', () => {
  it('preserves omitted fields and clears explicit blanks/null', () => {
    expect(normalizeLeadFields({})).toEqual({})
    expect(normalizeLeadFields({ phoneNumber: ' ', yearsAtCompany: '', linkedinUrl: null })).toEqual({
      phoneNumber: null,
      yearsAtCompany: null,
      linkedinUrl: null,
    })
  })
  it('preserves phone strings and zero', () => {
    expect(
      normalizeLeadFields({
        phoneNumber: ' +44 (20) 001 x5 ',
        yearsAtCompany: 0,
        linkedinUrl: ' https://linkedin.com/in/ada/ ',
      })
    ).toEqual({
      phoneNumber: '+44 (20) 001 x5',
      yearsAtCompany: 0,
      linkedinUrl: 'https://linkedin.com/in/ada/',
    })
  })
  it.each([true, '1', -1, 101, 0.5, NaN, Infinity])('rejects invalid API tenure %s', (yearsAtCompany) => {
    expect(() => normalizeLeadFields({ yearsAtCompany })).toThrow('yearsAtCompany')
  })
  it.each([123, false, {}, []])('rejects non-string phone %s', (phoneNumber) => {
    expect(() => normalizeLeadFields({ phoneNumber })).toThrow('phoneNumber')
  })
  it.each([
    'http://linkedin.com/in/ada',
    'https://evil.linkedin.com/in/ada',
    'https://linkedin.com.evil.test/in/ada',
    'https://linkedin.com/company/a',
    'https://user@linkedin.com/in/a',
    'https://linkedin.com:444/in/a',
    'javascript:alert(1)',
    'https://linkedin.com/in/',
  ])('rejects unsafe or non-profile URL %s', (linkedinUrl) => {
    expect(() => normalizeLeadFields({ linkedinUrl })).toThrow('linkedinUrl')
  })
})
