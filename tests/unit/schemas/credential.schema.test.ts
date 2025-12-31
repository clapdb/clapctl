import { describe, test, expect } from 'bun:test'
import { ClapDBCredentialSchema, CredentialFileSchema } from '../../../src/schemas/credential.schema'

describe('ClapDBCredentialSchema', () => {
  test('validates correct credential', () => {
    const result = ClapDBCredentialSchema.safeParse({
      dataApiEndpoint: 'https://api.example.com/data',
      licenseApiEndpoint: 'https://api.example.com/license',
      tenant: 'clapdb',
      database: 'local',
      username: 'root',
      password: 'MyP@ssw0rd!',
      sandbox: false,
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid URL for dataApiEndpoint', () => {
    const result = ClapDBCredentialSchema.safeParse({
      dataApiEndpoint: 'not-a-url',
      licenseApiEndpoint: 'https://api.example.com/license',
      tenant: 'clapdb',
      database: 'local',
      username: 'root',
      password: 'MyP@ssw0rd!',
    })
    expect(result.success).toBe(false)
  })

  test('rejects short password', () => {
    const result = ClapDBCredentialSchema.safeParse({
      dataApiEndpoint: 'https://api.example.com/data',
      licenseApiEndpoint: 'https://api.example.com/license',
      tenant: 'clapdb',
      database: 'local',
      username: 'root',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  test('defaults sandbox to false', () => {
    const result = ClapDBCredentialSchema.safeParse({
      dataApiEndpoint: 'https://api.example.com/data',
      licenseApiEndpoint: 'https://api.example.com/license',
      tenant: 'clapdb',
      database: 'local',
      username: 'root',
      password: 'LongEnough123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sandbox).toBe(false)
    }
  })
})

describe('CredentialFileSchema', () => {
  test('validates correct credential file', () => {
    const result = CredentialFileSchema.safeParse({
      version: '1.0',
      profiles: {
        'my-stack': {
          dataApiEndpoint: 'https://api.example.com/data',
          licenseApiEndpoint: 'https://api.example.com/license',
          tenant: 'clapdb',
          database: 'local',
          username: 'root',
          password: 'MyP@ssw0rd!',
          sandbox: false,
        },
      },
    })
    expect(result.success).toBe(true)
  })

  test('allows empty profiles', () => {
    const result = CredentialFileSchema.safeParse({
      version: '1.0',
      profiles: {},
    })
    expect(result.success).toBe(true)
  })

  test('allows multiple profiles', () => {
    const result = CredentialFileSchema.safeParse({
      version: '1.0',
      profiles: {
        'stack-1': {
          dataApiEndpoint: 'https://api1.example.com/data',
          licenseApiEndpoint: 'https://api1.example.com/license',
          tenant: 'tenant1',
          database: 'db1',
          username: 'user1',
          password: 'Password123!',
          sandbox: false,
        },
        'stack-2': {
          dataApiEndpoint: 'https://api2.example.com/data',
          licenseApiEndpoint: 'https://api2.example.com/license',
          tenant: 'tenant2',
          database: 'db2',
          username: 'user2',
          password: 'Password456!',
          sandbox: true,
        },
      },
    })
    expect(result.success).toBe(true)
  })
})
