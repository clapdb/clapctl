/**
 * Cloud Provider Module
 *
 * This module provides a cloud-agnostic interface for managing ClapDB deployments.
 * It supports multiple cloud vendors through a provider abstraction.
 *
 * Currently supported providers:
 * - AWS (Amazon Web Services)
 *
 * Future providers (planned):
 * - Azure (Microsoft Azure)
 * - GCP (Google Cloud Platform)
 * - Alibaba Cloud
 *
 * @example
 * ```typescript
 * import { createCloudProvider } from './services/cloud'
 *
 * // Create an AWS provider
 * const provider = await createCloudProvider('aws', 'default')
 *
 * // Deploy a service
 * await provider.deployService('my-stack', config)
 * ```
 */

// Types
export type {
  ArtifactInfo,
  DeployConfig,
  QuotaRequestResult,
  ResourceStatus,
  StackInfo,
  UserPayload,
} from './types'

export { DeployAction } from './types'

// Provider interface and utilities
export type { CloudProvider, CloudProviderFactory } from './provider'
export { createCloudProvider, getRegisteredProviders, registerCloudProvider } from './provider'

// AWS Provider (default)
export { AWSCloudProvider } from './aws'
