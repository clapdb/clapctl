/**
 * ClapDB Regression Testing Module
 *
 * This module provides functionality for running SQL regression tests
 * against ClapDB instances. Tests are defined in YAML files and specify
 * expected query results for validation.
 */

import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

// ============================================================================
// Types and Interfaces
// ============================================================================

/** A single regression test case */
export interface RegressCase {
  /** Target table name (for documentation) */
  table: string
  /** SQL query to execute */
  sql: string
  /** Expected results */
  expected: {
    /** Expected HTTP status code */
    status_code: number
    /** Expected response body */
    body: string
  }
}

/** Result of running a regression test */
export interface RegressResult {
  /** Test case index */
  index: number
  /** Whether the test passed */
  passed: boolean
  /** Failure reason (if failed) */
  reason?: string
  /** Expected value (if failed) */
  expected?: string
  /** Actual value (if failed) */
  actual?: string
}

// ============================================================================
// Default Test Cases
// ============================================================================

/**
 * Default regression test cases for validating ClapDB functionality.
 * These tests cover basic operations on sample datasets.
 */
const DEFAULT_REGRESSION_CASES: RegressCase[] = [
  {
    table: 'mgbench_logs2',
    sql: 'show create table mgbench_logs2;',
    expected: {
      status_code: 200,
      body: `CREATE TABLE mgbench_logs2 (
  log_time datetime,
  client_ip ipv4,
  request string,
  status_code uint16,
  object_size uint64
);
`,
    },
  },
  {
    table: 'mgbench_logs2',
    sql: 'select count(*) from mgbench_logs2',
    expected: {
      status_code: 200,
      body: `count
75748118
`,
    },
  },
  {
    table: 'mgbench_logs2',
    sql: 'SELECT sum(object_size), AVG(object_size) FROM mgbench_logs2',
    expected: {
      status_code: 200,
      body: `sum,avg
10796281442399,142528.7086657255299542
`,
    },
  },
  {
    table: 'hdfs_logs',
    sql: 'select count(*) from hdfs_logs',
    expected: {
      status_code: 200,
      body: `count(*)
20000000
`,
    },
  },
]

// ============================================================================
// Functions
// ============================================================================

/**
 * Load the default regression test cases
 *
 * @returns Array of default test cases
 */
export async function loadDefaultRegressionList(): Promise<RegressCase[]> {
  return DEFAULT_REGRESSION_CASES
}

/**
 * Load regression test cases from a YAML file
 *
 * @param filePath - Path to the YAML file
 * @returns Array of test cases
 * @throws Error if file cannot be read or parsed
 *
 * @example
 * ```yaml
 * # regression.yaml
 * - table: users
 *   sql: SELECT count(*) FROM users
 *   expected:
 *     status_code: 200
 *     body: |
 *       count
 *       100
 * ```
 */
export async function loadRegressionList(filePath: string): Promise<RegressCase[]> {
  const content = await readFile(filePath, 'utf-8')
  const cases = parse(content) as RegressCase[]
  return cases
}

/**
 * Parse a comma-separated subset string into an array of indices
 *
 * @param value - Comma-separated string (e.g., "0,2,4")
 * @returns Array of indices
 *
 * @example
 * ```typescript
 * parseSubset("0,2,4")  // [0, 2, 4]
 * parseSubset("")       // []
 * parseSubset("1,3,5")  // [1, 3, 5]
 * ```
 */
export function parseSubset(value: string): number[] {
  if (!value) return []

  return value
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

/**
 * Check if an index is in the subset
 *
 * If the subset is empty, all indices are considered to be in the subset.
 *
 * @param val - Index to check
 * @param subset - Array of allowed indices
 * @returns true if index is in subset or subset is empty
 */
export function isInSubset(val: number, subset: number[]): boolean {
  if (subset.length === 0) return true
  return subset.includes(val)
}
