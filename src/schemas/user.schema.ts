import { z } from 'zod'

export const UserPayloadSchema = z.object({
  name: z.string().min(1),
  password: z
    .string()
    .min(8)
    .refine(
      (password) => {
        const hasLowercase = /[a-z]/.test(password)
        const hasUppercase = /[A-Z]/.test(password)
        const hasDigit = /\d/.test(password)
        const hasSpecial = /[!@#$%^&*]/.test(password)
        return hasLowercase && hasUppercase && hasDigit && hasSpecial
      },
      {
        message:
          'Password must contain at least one lowercase, uppercase, digit, and special character (!@#$%^&*)',
      },
    ),
  tenant: z.string().min(1),
  database: z.string().min(1),
})

export type UserPayload = z.infer<typeof UserPayloadSchema>
