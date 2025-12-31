/**
 * Cloud Provider Types and Interfaces
 *
 * This module defines the abstract types used across all cloud providers.
 * These types are cloud-agnostic and can be implemented by any cloud vendor.
 */

import type { Ora } from 'ora'

// ============================================================================
// Deployment Configuration
// ============================================================================

/**
 * Deployment configuration for creating/updating a ClapDB service
 */
export interface DeployConfig {
  /** Stack/deployment name */
  stackName: string
  /** CPU architecture: x86_64 or arm64 */
  arch: 'x86_64' | 'arm64'
  /** Memory size for main Lambda function (MB) */
  lambdaMemorySize: number
  /** Memory size for dispatcher function (MB) */
  dispatcherMemorySize: number
  /** Memory size for reducer function (MB) */
  reducerMemorySize: number
  /** Memory size for worker function (MB) */
  workerMemorySize: number
  /** Deploy within private VPC */
  enablePrivateVpc: boolean
  /** Use private API Gateway endpoint */
  enablePrivateEndpoint: boolean
  /** Enable API Gateway logging */
  enableLogging: boolean
  /** Specific ClapDB version (commit hash or tag) */
  clapdbVersion?: string
  /** Artifacts bucket name (optional, derived from region if not provided) */
  artifactsBucket?: string
  /** CloudFormation template body (optional) */
  templateBody?: string
  /** Update built-in template */
  updateBuiltinTemplate: boolean
}

// ============================================================================
// Stack/Deployment Status
// ============================================================================

/**
 * Deployment action type
 */
export enum DeployAction {
  Deploy = 'deploy',
  Update = 'update',
  Delete = 'delete',
}

/**
 * Stack/deployment information
 */
export interface StackInfo {
  /** Stack/deployment name */
  name: string
  /** Current status */
  status: string
  /** Creation timestamp */
  createdAt: Date
}

/**
 * Resource status within a deployment
 */
export interface ResourceStatus {
  /** Resource logical ID */
  id: string
  /** Resource type */
  type: string
  /** Current status */
  status: string
}

// ============================================================================
// User Management
// ============================================================================

/**
 * User payload for adding a ClapDB user
 */
export interface UserPayload {
  /** Username */
  name: string
  /** Password */
  password: string
  /** Tenant name */
  tenant: string
  /** Database name */
  database: string
}

// ============================================================================
// Quota Management
// ============================================================================

/**
 * Quota request result
 */
export interface QuotaRequestResult {
  /** Request ID for tracking */
  requestId: string
  /** Current quota value */
  currentValue?: number
  /** Requested quota value */
  requestedValue: number
}

// ============================================================================
// Artifact Management
// ============================================================================

/**
 * Artifact information
 */
export interface ArtifactInfo {
  /** Latest version tag */
  latestTag: string
  /** Latest commit hash */
  latestHash: string
  /** Whether artifact exists for given version/arch */
  exists: boolean
}
