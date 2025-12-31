import { describe, expect, test } from 'bun:test'
import {
  AWS_REGIONS,
  DeployConfigurationSchema,
  getArtifactsBucket,
} from '../../../src/schemas/config.schema'

describe('Config Schema', () => {
  describe('DeployConfigurationSchema', () => {
    test('should validate minimal config', () => {
      const config = {
        stackName: 'test-stack',
      }
      const result = DeployConfigurationSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    test('should apply default values', () => {
      const config = {
        stackName: 'test-stack',
      }
      const result = DeployConfigurationSchema.parse(config)
      expect(result.arch).toBe('x86_64')
      expect(result.lambdaMemorySize).toBe(3008)
      expect(result.enablePrivateVpc).toBe(false)
      expect(result.enableLogging).toBe(false)
    })

    test('should reject empty stack name', () => {
      const config = {
        stackName: '',
      }
      const result = DeployConfigurationSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('should validate arch enum', () => {
      const validConfig = { stackName: 'test', arch: 'arm64' }
      expect(DeployConfigurationSchema.safeParse(validConfig).success).toBe(true)

      const invalidConfig = { stackName: 'test', arch: 'invalid' }
      expect(DeployConfigurationSchema.safeParse(invalidConfig).success).toBe(false)
    })

    test('should validate memory size range', () => {
      const validConfig = { stackName: 'test', lambdaMemorySize: 1024 }
      expect(DeployConfigurationSchema.safeParse(validConfig).success).toBe(true)

      const tooSmall = { stackName: 'test', lambdaMemorySize: 64 }
      expect(DeployConfigurationSchema.safeParse(tooSmall).success).toBe(false)

      const tooLarge = { stackName: 'test', lambdaMemorySize: 20000 }
      expect(DeployConfigurationSchema.safeParse(tooLarge).success).toBe(false)
    })

    test('should accept optional fields', () => {
      const config = {
        stackName: 'test-stack',
        clapdbVersion: 'v1.0.0',
        artifactsBucket: 'my-bucket',
        templateBody: 'template content',
      }
      const result = DeployConfigurationSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })

  describe('AWS_REGIONS', () => {
    test('should be an array of strings', () => {
      expect(Array.isArray(AWS_REGIONS)).toBe(true)
      expect(AWS_REGIONS.length).toBeGreaterThan(0)
    })

    test('should contain common regions', () => {
      expect(AWS_REGIONS).toContain('us-east-1')
      expect(AWS_REGIONS).toContain('us-west-2')
      expect(AWS_REGIONS).toContain('eu-west-1')
      expect(AWS_REGIONS).toContain('ap-northeast-1')
    })

    test('should contain China regions', () => {
      expect(AWS_REGIONS).toContain('cn-north-1')
      expect(AWS_REGIONS).toContain('cn-northwest-1')
    })

    test('regions should be valid format', () => {
      for (const region of AWS_REGIONS) {
        expect(region).toMatch(/^[a-z]{2}-[a-z]+-\d+$/)
      }
    })
  })

  describe('getArtifactsBucket', () => {
    test('should return bucket name with region suffix', () => {
      expect(getArtifactsBucket('us-east-1')).toBe('clapdb-pkgs-us-east-1')
      expect(getArtifactsBucket('eu-west-1')).toBe('clapdb-pkgs-eu-west-1')
    })

    test('should handle China regions', () => {
      expect(getArtifactsBucket('cn-north-1')).toBe('clapdb-pkgs-cn-north-1')
    })
  })
})
