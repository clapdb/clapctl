/**
 * AWS Cloud Provider Implementation
 *
 * This module implements the CloudProvider interface for Amazon Web Services.
 * It wraps the AWS SDK and provides a unified API for managing ClapDB deployments.
 *
 * @example
 * ```typescript
 * const provider = await AWSCloudProvider.create('default')
 * await provider.deployService('my-stack', config)
 * ```
 */

import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import type { Ora } from 'ora'
import { getArtifactsBucket } from '../../../schemas'
import type { CloudProvider } from '../provider'
import type {
  ArtifactInfo,
  DeployConfig,
  QuotaRequestResult,
  StackInfo,
  UserPayload,
} from '../types'
import { DeployAction } from '../types'
import { CloudFormationService } from './cloudformation'
import { ECRService } from './ecr'
import { LambdaService } from './lambda'
import { QuotaService } from './quota'
import { S3Service } from './s3'

/**
 * AWS Cloud Provider
 *
 * Implements the CloudProvider interface for AWS. Uses CloudFormation for
 * infrastructure management, S3 for storage, Lambda for compute, and
 * ECR for container registry.
 */
export class AWSCloudProvider implements CloudProvider {
  readonly name = 'aws'

  private readonly cloudformation: CloudFormationService
  private readonly s3: S3Service
  private readonly lambda: LambdaService
  private readonly ecr: ECRService
  private readonly quota: QuotaService
  private readonly _region: string

  /**
   * Create an AWS provider instance
   *
   * @param profile - AWS profile name
   * @param region - AWS region
   */
  constructor(
    public readonly profile: string,
    region?: string,
  ) {
    const credentials = fromIni({ profile })

    this._region = region ?? 'us-east-1'

    this.cloudformation = new CloudFormationService(this._region, credentials)
    this.s3 = new S3Service(this._region, credentials)
    this.lambda = new LambdaService(this._region, credentials)
    this.ecr = new ECRService(this._region, credentials)
    this.quota = new QuotaService(this._region, credentials)
  }

  /**
   * Create and validate an AWS provider instance
   *
   * @param profile - AWS profile name
   * @returns Validated AWS provider
   * @throws Error if credentials are invalid
   */
  static async create(profile: string): Promise<AWSCloudProvider> {
    const credentials = fromIni({ profile })
    const sts = new STSClient({ credentials })

    try {
      await sts.send(new GetCallerIdentityCommand({}))
    } catch {
      throw new Error(`Invalid AWS credentials for profile '${profile}'`)
    }

    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1'
    return new AWSCloudProvider(profile, region)
  }

  get region(): string {
    return this._region
  }

  // ==========================================================================
  // Stack/Deployment Lifecycle
  // ==========================================================================

  async deployService(stackName: string, config: DeployConfig): Promise<string> {
    const bucket = config.artifactsBucket ?? getArtifactsBucket(this._region)
    let version = config.clapdbVersion

    if (!version) {
      version = await this.s3.getLatestTag(bucket)
    } else if (version === 'latest') {
      version = await this.s3.getLatestHash(bucket)
    } else {
      const hasArtifact = await this.s3.hasArtifact(bucket, version, config.arch)
      if (!hasArtifact) {
        throw new Error('Invalid version')
      }
    }

    const deployConfig = {
      ...config,
      clapdbVersion: version,
      artifactsBucket: bucket,
    }

    return this.cloudformation.createStack(stackName, deployConfig)
  }

  async updateService(stackName: string, config: DeployConfig): Promise<string> {
    const bucket = config.artifactsBucket ?? getArtifactsBucket(this._region)
    let version = config.clapdbVersion

    if (!version) {
      version = await this.s3.getLatestTag(bucket)
    } else if (version === 'latest') {
      version = await this.s3.getLatestHash(bucket)
    } else {
      const hasArtifact = await this.s3.hasArtifact(bucket, version, config.arch)
      if (!hasArtifact) {
        throw new Error('Artifact not found, check the version/commit')
      }
    }

    const updateConfig = {
      ...config,
      clapdbVersion: version,
      artifactsBucket: bucket,
    }

    return this.cloudformation.updateStack(stackName, updateConfig)
  }

  async deleteService(stackName: string, withStorage: boolean): Promise<string> {
    if (withStorage) {
      const bucketName = await this.cloudformation.getStorageBucket(stackName)
      if (bucketName) {
        console.log(`Deleting storage bucket: ${bucketName}...`)
        await this.s3.deleteBucket(bucketName)
        console.log(`Delete storage bucket: ${bucketName} done.`)
      }
    }

    await this.cloudformation.deleteStack(stackName)
    return this.getConsoleUrl(stackName)
  }

  async watchService(stackName: string, spinner: Ora, action: DeployAction): Promise<void> {
    try {
      while (true) {
        let completed: boolean
        try {
          completed = await this.cloudformation.isStackDeployCompleted(stackName)
        } catch {
          if (action === DeployAction.Delete) {
            return
          }
          throw new Error('Failed to check deployment status')
        }

        if (!completed) {
          await this.showFirstProcessedResource(stackName, spinner, action)
          await new Promise((resolve) => setTimeout(resolve, 500))
          continue
        }

        let failed: boolean
        try {
          failed = await this.cloudformation.isStackDeployFailed(stackName)
        } catch {
          if (action === DeployAction.Delete) {
            return
          }
          throw new Error('Failed to check deployment status')
        }

        if (failed) {
          const messages = {
            [DeployAction.Deploy]: 'deploy service failed, you should check deploy detail',
            [DeployAction.Update]: 'update service failed, you should check update detail',
            [DeployAction.Delete]: 'delete service failed, you should check delete detail',
          }
          throw new Error(messages[action])
        }

        return
      }
    } finally {
      spinner.stop()
    }
  }

  private async showFirstProcessedResource(
    stackName: string,
    spinner: Ora,
    action: DeployAction,
  ): Promise<boolean> {
    try {
      const status = await this.cloudformation.getResourcesStatus(stackName)

      for (const [resource, resourceStatus] of status) {
        if (action === DeployAction.Deploy) {
          if (resourceStatus === 'CREATE_COMPLETE' || resourceStatus === 'UPDATE_COMPLETE') {
            spinner.text = ` ${resource} => ${resourceStatus}`
            return true
          }
        }
        if (action === DeployAction.Delete) {
          if (resourceStatus === 'DELETE_COMPLETE') {
            spinner.text = ` ${resource} => ${resourceStatus}`
            return true
          }
        }
        if (action === DeployAction.Update) {
          if (resourceStatus === 'UPDATE_COMPLETE') {
            spinner.text = ` ${resource} => ${resourceStatus}`
            return true
          }
        }
      }
    } catch {
      if (action === DeployAction.Delete || action === DeployAction.Deploy) {
        return true
      }
    }
    return false
  }

  // ==========================================================================
  // Stack/Deployment Information
  // ==========================================================================

  async listStacks(): Promise<StackInfo[]> {
    const stacks = await this.cloudformation.listClapDBStacks()
    return stacks.map((stack) => ({
      name: stack.name,
      status: stack.status,
      createdAt: stack.createdAt,
    }))
  }

  async hasStack(stackName: string): Promise<boolean> {
    return this.cloudformation.hasStack(stackName)
  }

  async getStackStatus(stackName: string): Promise<string> {
    return this.cloudformation.getStackStatus(stackName)
  }

  getConsoleUrl(stackId: string): string {
    const consoleDomain = this.isAWSChinaRegion()
      ? 'https://console.amazonaws.cn'
      : 'https://console.aws.amazon.com'

    return `${consoleDomain}/cloudformation/home?region=${this._region}#/stacks/stackinfo?stackId=${encodeURIComponent(stackId)}`
  }

  /**
   * Check if running in AWS China region
   */
  isAWSChinaRegion(): boolean {
    return this._region.startsWith('cn-')
  }

  // ==========================================================================
  // Endpoint Discovery
  // ==========================================================================

  async getDataApiUrl(stackName: string): Promise<string> {
    return this.cloudformation.getDataApiUrl(stackName)
  }

  async getLicenseApiUrl(stackName: string): Promise<string> {
    return this.cloudformation.getLicenseApiUrl(stackName)
  }

  // ==========================================================================
  // User Management
  // ==========================================================================

  async addUser(stackName: string, user: UserPayload): Promise<void> {
    const lambdaName = await this.cloudformation.getInitLambdaName(stackName)
    const payload = JSON.stringify(user)
    await this.lambda.invoke(lambdaName, payload)
  }

  // ==========================================================================
  // Storage Operations
  // ==========================================================================

  async getStorageBucket(stackName: string): Promise<string> {
    return this.cloudformation.getStorageBucket(stackName)
  }

  async getServiceLicense(bucket: string, key: string): Promise<string> {
    return this.s3.readObject(bucket, key)
  }

  async upgradeServiceLicense(bucket: string, key: string, content: string): Promise<void> {
    await this.s3.updateObjectWithContent(bucket, key, content)
  }

  // ==========================================================================
  // Quota Management
  // ==========================================================================

  async getComputeQuota(): Promise<number> {
    return this.quota.getLambdaQuota()
  }

  async requestComputeQuotaIncrease(newQuota: number): Promise<QuotaRequestResult> {
    const requestId = await this.quota.setLambdaQuota(newQuota)
    return {
      requestId,
      requestedValue: newQuota,
    }
  }

  // ==========================================================================
  // Artifact Management
  // ==========================================================================

  async getArtifactInfo(bucket: string, version?: string, arch?: string): Promise<ArtifactInfo> {
    const latestTag = await this.s3.getLatestTag(bucket)
    const latestHash = await this.s3.getLatestHash(bucket)

    let exists = true
    if (version && arch) {
      exists = await this.s3.hasArtifact(bucket, version, arch)
    }

    return {
      latestTag,
      latestHash,
      exists,
    }
  }

  // ==========================================================================
  // Legacy Compatibility (for gradual migration)
  // ==========================================================================

  /**
   * Get Lambda function name for a stack
   * @deprecated Use internal operations instead
   */
  async getLambdaFunction(stackName: string): Promise<string> {
    return this.cloudformation.getInitLambdaName(stackName)
  }

  /**
   * Get Lambda quota
   * @deprecated Use getComputeQuota instead
   */
  async getLambdaQuota(): Promise<number> {
    return this.getComputeQuota()
  }

  /**
   * Set Lambda quota
   * @deprecated Use requestComputeQuotaIncrease instead
   */
  async setLambdaQuota(newQuota: number): Promise<string> {
    const result = await this.requestComputeQuotaIncrease(newQuota)
    return result.requestId
  }

  /**
   * Get CloudFormation URL
   * @deprecated Use getConsoleUrl instead
   */
  getCloudformationUrl(stackId: string): string {
    return this.getConsoleUrl(stackId)
  }

  /**
   * List ClapDB stacks
   * @deprecated Use listStacks instead
   */
  async listClapDBStacks(): Promise<StackInfo[]> {
    return this.listStacks()
  }

  /**
   * Storage bucket alias
   * @deprecated Use getStorageBucket instead
   */
  async storageBucket(stackName: string): Promise<string> {
    return this.getStorageBucket(stackName)
  }
}
