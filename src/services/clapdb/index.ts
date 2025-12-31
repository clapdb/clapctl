/**
 * ClapDB Services
 *
 * This module exports all ClapDB-related services:
 * - ClapDBEngine: Core database operations
 * - Auth0Service: Authentication
 * - ClapDBAPIService: Management API
 * - Regression: Testing utilities
 */

// Engine exports
export {
  ClapDBEngine,
  DATASETS,
  findDataset,
  getDatasetS3Uri,
  isValidFormat,
  type Dataset,
  type DataFormat,
  type ImportResponse,
  type LicenseDetail,
  type TableMeta,
} from './engine'

// Regression testing exports
export {
  loadDefaultRegressionList,
  loadRegressionList,
  parseSubset,
  isInSubset,
  type RegressCase,
  type RegressResult,
} from './regression'

// Authentication and API exports
export {
  Auth0Service,
  ClapDBAPIService,
  type DeviceCodeState,
  type TokenResponse,
  type LicenseData,
  type LicenseDetail as APILicenseDetail,
} from './auth'
