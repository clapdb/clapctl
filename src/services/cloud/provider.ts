/**
 * Cloud Provider Interface
 *
 * This module defines the abstract CloudProvider interface that all cloud
 * vendor implementations must follow. This enables multi-cloud support.
 *
 * @example
 * ```typescript
 * // AWS implementation
 * const provider = await AWSCloudProvider.create('default')
 *
 * // Future: Azure implementation
 * const provider = await AzureCloudProvider.create('subscription-id')
 *
 * // Future: GCP implementation
 * const provider = await GCPCloudProvider.create('project-id')
 * ```
 */

import type { Ora } from 'ora'
import type {
  ArtifactInfo,
  DeployAction,
  DeployConfig,
  QuotaRequestResult,
  ResourceStatus,
  StackInfo,
  UserPayload,
} from './types'

/**
 * Abstract Cloud Provider Interface
 *
 * Defines the contract that all cloud vendor implementations must fulfill.
 * This interface abstracts away cloud-specific details and provides a
 * unified API for managing ClapDB deployments across different cloud platforms.
 */
export interface CloudProvider {
  // ==========================================================================
  // Provider Information
  // ==========================================================================

  /** Cloud provider name (e.g., 'aws', 'azure', 'gcp') */
  readonly name: string

  /** Profile/account identifier */
  readonly profile: string

  /** Region/location for deployments */
  readonly region: string

  // ==========================================================================
  // Stack/Deployment Lifecycle
  // ==========================================================================

  /**
   * Deploy a new ClapDB service
   *
   * @param stackName - Name for the deployment
   * @param config - Deployment configuration
   * @returns Deployment/stack identifier
   */
  deployService(stackName: string, config: DeployConfig): Promise<string>

  /**
   * Update an existing ClapDB service
   *
   * @param stackName - Name of the deployment to update
   * @param config - New deployment configuration
   * @returns Deployment/stack identifier
   */
  updateService(stackName: string, config: DeployConfig): Promise<string>

  /**
   * Delete a ClapDB service
   *
   * @param stackName - Name of the deployment to delete
   * @param withStorage - Also delete associated storage (S3 bucket, etc.)
   * @returns Console URL for monitoring deletion
   */
  deleteService(stackName: string, withStorage: boolean): Promise<string>

  /**
   * Watch deployment progress with spinner feedback
   *
   * @param stackName - Name of the deployment
   * @param spinner - Ora spinner for visual feedback
   * @param action - Type of action being watched
   */
  watchService(stackName: string, spinner: Ora, action: DeployAction): Promise<void>

  // ==========================================================================
  // Stack/Deployment Information
  // ==========================================================================

  /**
   * List all ClapDB deployments
   *
   * @returns Array of stack information
   */
  listStacks(): Promise<StackInfo[]>

  /**
   * Check if a deployment exists
   *
   * @param stackName - Name of the deployment
   * @returns True if deployment exists
   */
  hasStack(stackName: string): Promise<boolean>

  /**
   * Get deployment status
   *
   * @param stackName - Name of the deployment
   * @returns Current status string
   */
  getStackStatus(stackName: string): Promise<string>

  /**
   * Get console URL for deployment details
   *
   * @param stackId - Deployment identifier
   * @returns URL to cloud console
   */
  getConsoleUrl(stackId: string): string

  // ==========================================================================
  // Endpoint Discovery
  // ==========================================================================

  /**
   * Get Data API endpoint URL
   *
   * @param stackName - Name of the deployment
   * @returns Data API URL
   */
  getDataApiUrl(stackName: string): Promise<string>

  /**
   * Get License API endpoint URL
   *
   * @param stackName - Name of the deployment
   * @returns License API URL
   */
  getLicenseApiUrl(stackName: string): Promise<string>

  // ==========================================================================
  // User Management
  // ==========================================================================

  /**
   * Add a user to the ClapDB deployment
   *
   * @param stackName - Name of the deployment
   * @param user - User payload
   */
  addUser(stackName: string, user: UserPayload): Promise<void>

  // ==========================================================================
  // Storage Operations
  // ==========================================================================

  /**
   * Get storage bucket/container name for a deployment
   *
   * @param stackName - Name of the deployment
   * @returns Storage bucket/container name
   */
  getStorageBucket(stackName: string): Promise<string>

  /**
   * Read license from storage
   *
   * @param bucket - Storage bucket/container name
   * @param key - Object key/path
   * @returns License content
   */
  getServiceLicense(bucket: string, key: string): Promise<string>

  /**
   * Update license in storage
   *
   * @param bucket - Storage bucket/container name
   * @param key - Object key/path
   * @param content - New license content
   */
  upgradeServiceLicense(bucket: string, key: string, content: string): Promise<void>

  // ==========================================================================
  // Quota Management
  // ==========================================================================

  /**
   * Get current serverless compute quota
   *
   * @returns Current quota value
   */
  getComputeQuota(): Promise<number>

  /**
   * Request quota increase for serverless compute
   *
   * @param newQuota - Requested quota value
   * @returns Request result with tracking ID
   */
  requestComputeQuotaIncrease(newQuota: number): Promise<QuotaRequestResult>

  // ==========================================================================
  // Artifact Management
  // ==========================================================================

  /**
   * Get artifact information from artifacts bucket
   *
   * @param bucket - Artifacts bucket name
   * @param version - Version to check (optional)
   * @param arch - Architecture to check (optional)
   * @returns Artifact information
   */
  getArtifactInfo(bucket: string, version?: string, arch?: string): Promise<ArtifactInfo>
}

/**
 * Cloud provider factory function type
 */
export type CloudProviderFactory = (profile: string) => Promise<CloudProvider>

/**
 * Registry of cloud provider factories
 */
const providerFactories = new Map<string, CloudProviderFactory>()

/**
 * Register a cloud provider factory
 *
 * @param name - Provider name (e.g., 'aws', 'azure', 'gcp')
 * @param factory - Factory function to create provider instances
 */
export function registerCloudProvider(name: string, factory: CloudProviderFactory): void {
  providerFactories.set(name.toLowerCase(), factory)
}

/**
 * Create a cloud provider instance
 *
 * @param name - Provider name (e.g., 'aws', 'azure', 'gcp')
 * @param profile - Profile/account identifier
 * @returns Cloud provider instance
 * @throws Error if provider is not registered
 */
export async function createCloudProvider(name: string, profile: string): Promise<CloudProvider> {
  const factory = providerFactories.get(name.toLowerCase())
  if (!factory) {
    const available = Array.from(providerFactories.keys()).join(', ')
    throw new Error(`Unknown cloud provider: ${name}. Available: ${available || 'none'}`)
  }
  return factory(profile)
}

/**
 * Get list of registered cloud providers
 *
 * @returns Array of provider names
 */
export function getRegisteredProviders(): string[] {
  return Array.from(providerFactories.keys())
}
