import { describe, expect, test } from 'bun:test'
import { DATASETS, type Dataset } from '../../../../src/services/clapdb/engine'

describe('ClapDB Engine', () => {
  describe('DATASETS', () => {
    test('should export an array of datasets', () => {
      expect(Array.isArray(DATASETS)).toBe(true)
      expect(DATASETS.length).toBeGreaterThan(0)
    })

    test('each dataset should have required properties', () => {
      for (const dataset of DATASETS) {
        expect(dataset).toHaveProperty('name')
        expect(dataset).toHaveProperty('table')
        expect(dataset).toHaveProperty('format')
        expect(dataset).toHaveProperty('sql')
        expect(dataset).toHaveProperty('rows')
        expect(dataset).toHaveProperty('diskSpace')
      }
    })

    test('dataset names should end with format extension', () => {
      for (const dataset of DATASETS) {
        const validExtensions = ['.ndjson', '.csv', '.tsv', '.json']
        const hasValidExtension = validExtensions.some((ext) => dataset.name.endsWith(ext))
        expect(hasValidExtension).toBe(true)
      }
    })

    test('dataset table names should be valid identifiers', () => {
      for (const dataset of DATASETS) {
        expect(dataset.table).toMatch(/^[a-z_][a-z0-9_]*$/)
      }
    })

    test('dataset formats should be valid', () => {
      const validFormats = [
        'CSV',
        'CSVRaw',
        'CSVWithNames',
        'CSVRawWithNames',
        'TSV',
        'TSVRaw',
        'TSVWithNames',
        'TSVRawWithNames',
        'NDJSON',
        'JSON',
      ]

      for (const dataset of DATASETS) {
        expect(validFormats).toContain(dataset.format)
      }
    })

    test('dataset SQL should be CREATE TABLE statement', () => {
      for (const dataset of DATASETS) {
        expect(dataset.sql.trim().toUpperCase()).toMatch(/^CREATE TABLE/)
      }
    })

    test('dataset rows should be positive', () => {
      for (const dataset of DATASETS) {
        expect(dataset.rows).toBeGreaterThan(0)
      }
    })

    test('dataset diskSpace should be a valid size string', () => {
      for (const dataset of DATASETS) {
        // Matches formats like "5.7G", "98.3 GB", "1.2 MB", etc.
        expect(dataset.diskSpace).toMatch(/^\d+(\.\d+)?\s*(K|M|G|T)B?$/i)
      }
    })
  })

  describe('known datasets', () => {
    test('should have hdfs_logs dataset', () => {
      const dataset = DATASETS.find((d) => d.table === 'hdfs_logs')
      expect(dataset).toBeDefined()
      expect(dataset?.format).toBe('NDJSON')
    })

    test('should have line_changes dataset', () => {
      const dataset = DATASETS.find((d) => d.table === 'line_changes')
      expect(dataset).toBeDefined()
    })
  })

  describe('dataset uniqueness', () => {
    test('dataset names should be unique', () => {
      const names = DATASETS.map((d) => d.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    test('dataset table names should be unique', () => {
      const tables = DATASETS.map((d) => d.table)
      const uniqueTables = new Set(tables)
      expect(uniqueTables.size).toBe(tables.length)
    })
  })
})
