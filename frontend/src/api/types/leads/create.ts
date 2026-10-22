export type LeadsCreateInput = {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  yearsAtCompany?: number | null
  linkedinUrl?: string | null
}

export type LeadsCreateOutput = import('./getMany').LeadsGetManyOutput[number]
