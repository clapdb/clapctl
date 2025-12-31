import { describe, expect, test } from 'bun:test'
import {
  isInSubset,
  loadDefaultRegressionList,
  parseSubset,
} from '../../../../src/services/clapdb/regression'

describe('Regression Testing', () => {
  describe('loadDefaultRegressionList', () => {
    test('should return an array of test cases', async () => {
      const tests = await loadDefaultRegressionList()
      expect(Array.isArray(tests)).toBe(true)
      expect(tests.length).toBeGreaterThan(0)
    })

    test('each test case should have required properties', async () => {
      const tests = await loadDefaultRegressionList()
      for (const testCase of tests) {
        expect(testCase).toHaveProperty('table')
        expect(testCase).toHaveProperty('sql')
        expect(testCase).toHaveProperty('expected')
        expect(typeof testCase.table).toBe('string')
        expect(typeof testCase.sql).toBe('string')
      }
    })

    test('each test case should have expected with status_code and body', async () => {
      const tests = await loadDefaultRegressionList()
      for (const testCase of tests) {
        expect(testCase.expected).toHaveProperty('status_code')
        expect(testCase.expected).toHaveProperty('body')
        expect(typeof testCase.expected.status_code).toBe('number')
        expect(typeof testCase.expected.body).toBe('string')
      }
    })

    test('test case SQL should be non-empty', async () => {
      const tests = await loadDefaultRegressionList()
      for (const testCase of tests) {
        expect(testCase.sql.trim().length).toBeGreaterThan(0)
      }
    })
  })

  describe('parseSubset', () => {
    test('should parse single number', () => {
      const result = parseSubset('5')
      expect(result).toEqual([5])
    })

    test('should parse comma-separated numbers', () => {
      const result = parseSubset('1,2,3')
      expect(result).toEqual([1, 2, 3])
    })

    test('should handle spaces', () => {
      const result = parseSubset('1, 2, 3')
      expect(result).toEqual([1, 2, 3])
    })

    test('should return empty array for empty string', () => {
      const result = parseSubset('')
      expect(result).toEqual([])
    })

    test('should filter out NaN values', () => {
      const result = parseSubset('1,abc,3')
      expect(result).toEqual([1, 3])
    })

    test('should parse zero', () => {
      const result = parseSubset('0,1,2')
      expect(result).toEqual([0, 1, 2])
    })
  })

  describe('isInSubset', () => {
    test('should return true if index is in subset', () => {
      const subset = [1, 2, 3]
      expect(isInSubset(1, subset)).toBe(true)
      expect(isInSubset(2, subset)).toBe(true)
      expect(isInSubset(3, subset)).toBe(true)
    })

    test('should return false if index is not in subset', () => {
      const subset = [1, 2, 3]
      expect(isInSubset(0, subset)).toBe(false)
      expect(isInSubset(4, subset)).toBe(false)
    })

    test('should return true for empty subset (run all)', () => {
      expect(isInSubset(1, [])).toBe(true)
      expect(isInSubset(100, [])).toBe(true)
    })
  })
})
