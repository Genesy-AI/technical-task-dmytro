import { describe, expect, it } from 'vitest'
import { parseCsv } from './csvParser'

const parse = (headers: string, values: string) =>
  parseCsv(`firstName,lastName,email,${headers}\nAda,Lovelace,ada@example.com,${values}`)[0]

describe('new lead CSV fields', () => {
  it('preserves phone formatting, zero tenure and LinkedIn', () => {
    expect(
      parse('phoneNumber,yearsAtCompany,linkedinUrl', '+44 (20) 1234 x5,0,https://www.linkedin.com/in/ada')
    ).toMatchObject({
      phoneNumber: '+44 (20) 1234 x5',
      yearsAtCompany: 0,
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      isValid: true,
    })
  })
  it('accepts fixture and friendly aliases', () => {
    expect(parse('phone,yearsInRole,LinkedIn', '001-234,5,https://linkedin.com/in/ada')).toMatchObject({
      phoneNumber: '001-234',
      yearsAtCompany: 5,
      linkedinUrl: 'https://linkedin.com/in/ada',
    })
  })
  it('gives canonical tenure precedence even when blank', () => {
    expect(parse('yearsAtCompany,yearsInRole', ',5')).toMatchObject({ yearsAtCompany: null, isValid: true })
    expect(parse('yearsInRole,yearsAtCompany', '5,0')).toMatchObject({ yearsAtCompany: 0 })
  })
  it('keeps omitted optional fields null', () => {
    expect(parse('companyName', 'Example')).toMatchObject({
      phoneNumber: null,
      yearsAtCompany: null,
      linkedinUrl: null,
    })
  })
  it.each(['-1', '101', '1.5', 'true', '1e1', '2 years'])('blocks invalid tenure %s', (value) => {
    expect(parse('yearsAtCompany', value)).toMatchObject({
      isValid: false,
      errors: [expect.stringContaining('yearsAtCompany')],
    })
  })
  it.each([
    'http://linkedin.com/in/ada',
    'https://linkedin.com.evil.com/in/ada',
    'javascript:alert(1)',
    'https://linkedin.com/company/acme',
    'https://user@linkedin.com/in/ada',
    'https://linkedin.com:444/in/ada',
  ])('blocks invalid profile %s', (value) => {
    expect(parse('linkedinUrl', value)).toMatchObject({
      isValid: false,
      errors: [expect.stringContaining('linkedinUrl')],
    })
  })
  it('accepts maximum tenure and blank cells', () => {
    expect(parse('phoneNumber,yearsAtCompany,linkedinUrl', ',100,')).toMatchObject({
      phoneNumber: null,
      yearsAtCompany: 100,
      linkedinUrl: null,
      isValid: true,
    })
  })
})

it('reports physical source rows across BOM, blanks and multiline quoted fields', () => {
  const rows = parseCsv(
    '\uFEFFfirstName,lastName,email,yearsAtCompany\n\n"Ada\nAugusta",Lovelace,ada@example.com,0\nBad,Years,bad@example.com,101'
  )
  expect(rows.map((row) => row.rowIndex)).toEqual([3, 5])
  expect(rows[1].isValid).toBe(false)
})
