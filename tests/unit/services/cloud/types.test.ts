import { describe, expect, test } from 'bun:test'
import { DeployAction } from '../../../../src/services/cloud/types'

describe('Cloud Provider Types', () => {
  describe('DeployAction enum', () => {
    test('should have Deploy action', () => {
      expect(DeployAction.Deploy).toBe('deploy')
    })

    test('should have Update action', () => {
      expect(DeployAction.Update).toBe('update')
    })

    test('should have Delete action', () => {
      expect(DeployAction.Delete).toBe('delete')
    })

    test('should have exactly 3 actions', () => {
      const actions = Object.values(DeployAction)
      expect(actions.length).toBe(3)
    })
  })
})
