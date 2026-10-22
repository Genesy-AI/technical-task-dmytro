export interface LeadsBulkImportInput {
  leads: {
    firstName: string
    lastName: string
    email: string
    jobTitle?: string
    countryCode?: string | null
    companyName?: string
  }[]
}

export interface LeadsBulkImportOutput {
  success: boolean
  importedCount: number
  duplicatesSkipped: number
  invalidLeads: number
  warnings: Array<{
    inputIndex: number
    field: 'countryCode'
    message: string
  }>
  errors: Array<{
    inputIndex: number
    lead: unknown
    error: string
  }>
}
