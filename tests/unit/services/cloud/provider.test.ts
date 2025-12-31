import { describe, expect, test } from 'bun:test'
import {
  createCloudProvider,
  getRegisteredProviders,
  registerCloudProvider,
} from '../../../../src/services/cloud/provider'

describe('Cloud Provider Registry', () => {
  describe('registerCloudProvider', () => {
    test('should register a provider', () => {
      const mockFactory = async () => ({
        name: 'test',
        profile: 'default',
        region: 'us-east-1',
        deployService: async () => 'stack-id',
        updateService: async () => 'stack-id',
        deleteService: async () => 'url',
        watchService: async () => {},
        listStacks: async () => [],
        hasStack: async () => false,
        getStackStatus: async () => 'COMPLETE',
        getConsoleUrl: () => 'https://example.com',
        getDataApiUrl: async () => 'https://api.example.com',
        getLicenseApiUrl: async () => 'https://license.example.com',
        addUser: async () => {},
        getStorageBucket: async () => 'bucket',
        getServiceLicense: async () => 'license',
        upgradeServiceLicense: async () => {},
        getComputeQuota: async () => 1000,
        requestComputeQuotaIncrease: async () => ({ requestId: 'req-id', requestedValue: 2000 }),
        getArtifactInfo: async () => ({ latestTag: 'v1', latestHash: 'abc', exists: true }),
      })

      registerCloudProvider('test-provider', mockFactory)
      const providers = getRegisteredProviders()
      expect(providers).toContain('test-provider')
    })

    test('should register provider with lowercase name', () => {
      const mockFactory = async () => ({} as never)
      registerCloudProvider('TEST-UPPER', mockFactory)
      const providers = getRegisteredProviders()
      expect(providers).toContain('test-upper')
    })
  })

  describe('getRegisteredProviders', () => {
    test('should return array of provider names', () => {
      const providers = getRegisteredProviders()
      expect(Array.isArray(providers)).toBe(true)
    })

    test('should include aws provider after import', async () => {
      // Import AWS provider to trigger registration
      await import('../../../../src/services/cloud/aws')
      const providers = getRegisteredProviders()
      expect(providers).toContain('aws')
    })
  })

  describe('createCloudProvider', () => {
    test('should throw for unknown provider', async () => {
      await expect(createCloudProvider('unknown-provider', 'profile')).rejects.toThrow(
        /Unknown cloud provider/,
      )
    })
  })
})
