import { z } from 'zod'

export const ClapDBCredentialSchema = z.object({
  dataApiEndpoint: z.string().url(),
  licenseApiEndpoint: z.string().url(),
  tenant: z.string().min(1),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(8),
  sandbox: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export const CredentialFileSchema = z.object({
  version: z.string().default('1.0'),
  profiles: z.record(z.string(), ClapDBCredentialSchema),
})

export type ClapDBCredentialData = z.infer<typeof ClapDBCredentialSchema>
export type CredentialFile = z.infer<typeof CredentialFileSchema>
