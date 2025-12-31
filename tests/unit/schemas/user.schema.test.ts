import { describe, test, expect } from 'bun:test'
import { UserPayloadSchema } from '../../../src/schemas/user.schema'

describe('UserPayloadSchema', () => {
  test('validates correct user payload', () => {
    const result = UserPayloadSchema.safeParse({
      name: 'admin',
      password: 'MyP@ssw0rd!',
      tenant: 'clapdb',
      database: 'local',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty name', () => {
    const result = UserPayloadSchema.safeParse({
      name: '',
      password: 'MyP@ssw0rd!',
      tenant: 'clapdb',
      database: 'local',
    })
    expect(result.success).toBe(false)
  })

  test('rejects short password', () => {
    const result = UserPayloadSchema.safeParse({
      name: 'admin',
      password: 'Ab1!',
      tenant: 'clapdb',
      database: 'local',
    })
    expect(result.success).toBe(false)
  })

  test('rejects password without required characters', () => {
    const result = UserPayloadSchema.safeParse({
      name: 'admin',
      password: 'abcdefgh',
      tenant: 'clapdb',
      database: 'local',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty tenant', () => {
    const result = UserPayloadSchema.safeParse({
      name: 'admin',
      password: 'MyP@ssw0rd!',
      tenant: '',
      database: 'local',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty database', () => {
    const result = UserPayloadSchema.safeParse({
      name: 'admin',
      password: 'MyP@ssw0rd!',
      tenant: 'clapdb',
      database: '',
    })
    expect(result.success).toBe(false)
  })
})
