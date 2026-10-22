import Papa from 'papaparse'
import { normalizeCountryCode } from './countryCode'

export interface CsvLead {
  firstName: string
  lastName: string
  email: string
  jobTitle?: string
  countryCode: string | null
  originalCountryCode?: string
  warnings: string[]
  companyName?: string
  isValid: boolean
  errors: string[]
  rowIndex: number
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const parseCsv = (content: string): CsvLead[] => {
  if (!content?.trim()) {
    throw new Error('CSV content cannot be empty')
  }

  // Strip BOM before using Papa's character cursors to count physical source lines.
  const source = content.replace(/^\uFEFF/, '')
  const leadingBlankLines = source.match(/^(?:\r\n|\r|\n)+/)?.[0] || ''
  const input = source.slice(leadingBlankLines.length)
  let cursor = 0
  let sourceLine = 1 + (leadingBlankLines.match(/\r\n|\r|\n/g) || []).length
  const advance = (end: number) => {
    sourceLine += (input.slice(cursor, end).match(/\r\n|\r|\n/g) || []).length
    cursor = end
  }
  // Read only the header to locate the first data record, including quoted headers.
  Papa.parse(input, {
    step: (result, parser) => {
      if (result.errors.length) throw new Error(`CSV parsing failed: ${result.errors[0].message}`)
      advance(result.meta.cursor)
      parser.abort()
    },
  })

  const rows: Array<{ row: Record<string, string>; rowIndex: number }> = []
  Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: false,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim().toLowerCase(),
    quoteChar: '"',
    step: (result) => {
      const rowIndex = sourceLine
      advance(result.meta.cursor)
      const empty = Object.values(result.data).every((value) => !value)
      const criticalError = result.errors.find(
        (error) =>
          error.type === 'Delimiter' || error.type === 'Quotes' || (error.type === 'FieldMismatch' && !empty)
      )
      if (criticalError) throw new Error(`CSV parsing failed: ${criticalError.message}`)
      if (!empty) rows.push({ row: result.data, rowIndex })
    },
  })

  if (rows.length === 0) {
    throw new Error('CSV file appears to be empty or contains no valid data')
  }

  const data: CsvLead[] = []
  rows.forEach(({ row, rowIndex }) => {
    const lead: Partial<CsvLead> = { rowIndex, countryCode: null, warnings: [] }

    Object.entries(row).forEach(([header, value]) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '')
      const trimmedValue = value?.trim() || ''

      switch (normalizedHeader) {
        case 'firstname':
          lead.firstName = trimmedValue
          break
        case 'lastname':
          lead.lastName = trimmedValue
          break
        case 'email':
          lead.email = trimmedValue
          break
        case 'jobtitle':
          lead.jobTitle = trimmedValue || undefined
          break
        case 'countrycode':
          lead.originalCountryCode = trimmedValue
          const country = normalizeCountryCode(trimmedValue)
          lead.countryCode = country.countryCode
          lead.warnings = country.warning ? [`${country.warning}; will import without country.`] : []
          break
        case 'companyname':
          lead.companyName = trimmedValue || undefined
          break
      }
    })

    const errors: string[] = []
    if (!lead.firstName?.trim()) {
      errors.push('First name is required')
    }
    if (!lead.lastName?.trim()) {
      errors.push('Last name is required')
    }
    if (!lead.email?.trim()) {
      errors.push('Email is required')
    } else if (!isValidEmail(lead.email)) {
      errors.push('Invalid email format')
    }

    data.push({
      ...lead,
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      isValid: errors.length === 0,
      errors,
    } as CsvLead)
  })

  return data
}
