import { describe, test, expect } from 'bun:test'
import { generateRandomPassword, isPasswordValid } from '../../../src/utils/password'

describe('password utilities', () => {
  describe('generateRandomPassword', () => {
    test('generates password of specified length', () => {
      const password = generateRandomPassword(12)
      expect(password.length).toBe(12)
    })

    test('generates password with default length', () => {
      const password = generateRandomPassword()
      expect(password.length).toBe(12)
    })

    test('generates valid password', () => {
      const password = generateRandomPassword(12)
      expect(isPasswordValid(password)).toBe(true)
    })

    test('generates different passwords each time', () => {
      const password1 = generateRandomPassword(12)
      const password2 = generateRandomPassword(12)
      expect(password1).not.toBe(password2)
    })
  })

  describe('isPasswordValid', () => {
    test('rejects passwords shorter than 8 characters', () => {
      expect(isPasswordValid('Ab1!')).toBe(false)
      expect(isPasswordValid('Abc12!')).toBe(false)
    })

    test('rejects passwords without lowercase', () => {
      expect(isPasswordValid('ABCD1234!')).toBe(false)
    })

    test('rejects passwords without uppercase', () => {
      expect(isPasswordValid('abcd1234!')).toBe(false)
    })

    test('rejects passwords without digits', () => {
      expect(isPasswordValid('Abcdefgh!')).toBe(false)
    })

    test('rejects passwords without special characters', () => {
      expect(isPasswordValid('Abcdefg1')).toBe(false)
    })

    test('accepts valid passwords', () => {
      expect(isPasswordValid('Abcd123!')).toBe(true)
      expect(isPasswordValid('MyP@ssw0rd!')).toBe(true)
      expect(isPasswordValid('Secure#Pass1')).toBe(true)
    })
  })
})
