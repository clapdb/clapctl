import { describe, expect, test } from 'bun:test'
import { Auth0Service, ClapDBAPIService } from '../../../../src/services/clapdb/auth'

describe('ClapDB Auth Services', () => {
  describe('Auth0Service', () => {
    test('should create instance with default (production) config', () => {
      const service = new Auth0Service()
      expect(service).toBeDefined()
    })

    test('should create instance with sandbox config', () => {
      const service = new Auth0Service(true)
      expect(service).toBeDefined()
    })
  })

  describe('ClapDBAPIService', () => {
    test('should create instance with default (production) config', () => {
      const service = new ClapDBAPIService()
      expect(service).toBeDefined()
    })

    test('should create instance with sandbox config', () => {
      const service = new ClapDBAPIService(true)
      expect(service).toBeDefined()
    })
  })
})
