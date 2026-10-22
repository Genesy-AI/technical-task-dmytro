export type LeadsUpdateInput = {
  id: number
  firstName?: string
  email?: string
  phoneNumber?: string | null
  yearsAtCompany?: number | null
  linkedinUrl?: string | null
}

export type LeadsUpdateOutput = import('./getMany').LeadsGetManyOutput[number]
