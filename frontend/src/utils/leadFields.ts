export interface LeadFields {
  phoneNumber?: string | null
  yearsAtCompany?: number | null
  linkedinUrl?: string | null
}

export function isLinkedinUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      /^https:\/\//i.test(value) &&
      !/[\\\s]/.test(value) &&
      url.protocol === 'https:' &&
      (url.hostname === 'linkedin.com' || url.hostname === 'www.linkedin.com') &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^\/in\/[^/]+\/?$/.test(url.pathname)
    )
  } catch {
    return false
  }
}

// Omitted properties stay omitted so partial updates cannot clear existing data.
export function normalizeLeadFields(input: Record<string, unknown>): LeadFields {
  const fields: LeadFields = {}
  for (const key of ['phoneNumber', 'linkedinUrl'] as const) {
    const value = input[key]
    if (value === undefined) continue
    if (value === null || (typeof value === 'string' && !value.trim())) {
      fields[key] = null
    } else if (typeof value !== 'string') {
      throw new Error(`${key} must be a string`)
    } else {
      const trimmed = value.trim()
      if (key === 'linkedinUrl' && !isLinkedinUrl(trimmed)) {
        throw new Error('linkedinUrl must be an HTTPS LinkedIn profile URL (/in/profile)')
      }
      fields[key] = trimmed
    }
  }
  const years = input.yearsAtCompany
  if (years !== undefined) {
    if (years === null || (typeof years === 'string' && !years.trim())) {
      fields.yearsAtCompany = null
    } else if (typeof years === 'number' && Number.isInteger(years) && years >= 0 && years <= 100) {
      fields.yearsAtCompany = years
    } else {
      throw new Error('yearsAtCompany must be a whole number from 0 to 100')
    }
  }
  return fields
}
