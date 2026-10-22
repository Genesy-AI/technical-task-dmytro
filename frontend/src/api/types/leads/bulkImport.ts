export interface LeadsBulkImportInput {
  leads: {
    firstName: string
    lastName: string
    email: string
    phoneNumber?: string | null
    yearsAtCompany?: number | null
    linkedinUrl?: string | null
    jobTitle?: string
    countryCode?: string
    companyName?: string
  }[]
}

export interface LeadsBulkImportOutput {
  success: boolean
  importedCount: number
  duplicatesSkipped: number
  invalidLeads: number
  errors: Array<{
    inputIndex: number
    lead: unknown
    error: string
  }>
}
