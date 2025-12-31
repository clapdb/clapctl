import { fromIni } from '@aws-sdk/credential-providers'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import type { Ora } from 'ora'
import { CloudFormationService, type CloudFormationStack } from './cloudformation'
import { S3Service } from './s3'
import { LambdaService } from './lambda'
import { ECRService } from './ecr'
import { QuotaService } from './quota'
import type { DeployConfiguration } from '../../schemas'
import { getArtifactsBucket } from '../../schemas'
import type { UserPayload } from '../../schemas'

export enum Action {
  Deploy = 'deploy',
  Update = 'update',
  Delete = 'delete',
}

export class AWSService {
  readonly cloudformation: CloudFormationService
  readonly s3: S3Service
  readonly lambda: LambdaService
  readonly ecr: ECRService
  readonly quota: QuotaService

  private _region: string = ''

  constructor(
    public readonly profile: string,
    region?: string
  ) {
    const credentials = fromIni({ profile })

    // Default region, will be updated after initialization
    this._region = region ?? 'us-east-1'

    this.cloudformation = new CloudFormationService(this._region, credentials)
    this.s3 = new S3Service(this._region, credentials)
    this.lambda = new LambdaService(this._region, credentials)
    this.ecr = new ECRService(this._region, credentials)
    this.quota = new QuotaService(this._region, credentials)
  }

  static async create(profile: string): Promise<AWSService> {
    const credentials = fromIni({ profile })
    const sts = new STSClient({ credentials })

    try {
      await sts.send(new GetCallerIdentityCommand({}))
    } catch (err) {
      throw new Error(`Invalid AWS credentials for profile '${profile}'`)
    }

    // Get region from environment or default
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1'
    return new AWSService(profile, region)
  }

  get region(): string {
    return this._region
  }

  isAWSChinaRegion(): boolean {
    return this._region.startsWith('cn-')
  }

  getCloudformationUrl(stackId: string): string {
    const consoleDomain = this.isAWSChinaRegion()
      ? 'https://console.amazonaws.cn'
      : 'https://console.aws.amazon.com'

    return `${consoleDomain}/cloudformation/home?region=${this._region}#/stacks/stackinfo?stackId=${encodeURIComponent(stackId)}`
  }

  async getDataApiUrl(stackName: string): Promise<string> {
    return this.cloudformation.getDataApiUrl(stackName)
  }

  async getLicenseApiUrl(stackName: string): Promise<string> {
    return this.cloudformation.getLicenseApiUrl(stackName)
  }

  async getLambdaFunction(stackName: string): Promise<string> {
    return this.cloudformation.getInitLambdaName(stackName)
  }

  async getStackStatus(stackId: string): Promise<string> {
    return this.cloudformation.getStackStatus(stackId)
  }

  async listClapDBStacks(): Promise<CloudFormationStack[]> {
    return this.cloudformation.listClapDBStacks()
  }

  async hasStack(stackName: string): Promise<boolean> {
    return this.cloudformation.hasStack(stackName)
  }

  async deployService(stackName: string, config: DeployConfiguration): Promise<string> {
    // Get version if not provided
    let version = config.clapdbVersion
    const bucket = config.artifactsBucket ?? getArtifactsBucket(this._region)

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

    const deployConfig: DeployConfiguration = {
      ...config,
      clapdbVersion: version,
      artifactsBucket: bucket,
    }

    return this.cloudformation.createStack(stackName, deployConfig)
  }

  async updateService(stackName: string, config: DeployConfiguration): Promise<string> {
    // Get version if not provided
    let version = config.clapdbVersion
    const bucket = config.artifactsBucket ?? getArtifactsBucket(this._region)

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

    const updateConfig: DeployConfiguration = {
      ...config,
      clapdbVersion: version,
      artifactsBucket: bucket,
    }

    return this.cloudformation.updateStack(stackName, updateConfig)
  }

  async deleteService(stackName: string, withS3: boolean): Promise<string> {
    if (withS3) {
      const bucketName = await this.cloudformation.getStorageBucket(stackName)
      if (bucketName) {
        console.log(`Deleting storage bucket: ${bucketName}...`)
        await this.s3.deleteBucket(bucketName)
        console.log(`Delete storage bucket: ${bucketName} done.`)
      }
    }

    await this.cloudformation.deleteStack(stackName)
    return this.getCloudformationUrl(stackName)
  }

  async watchService(stackName: string, spinner: Ora, action: Action): Promise<void> {
    try {
      while (true) {
        let completed: boolean
        try {
          completed = await this.cloudformation.isStackDeployCompleted(stackName)
        } catch (err) {
          // During deletion, resources may disappear
          if (action === Action.Delete) {
            return
          }
          throw err
        }

        if (!completed) {
          await this.showFirstProcessedResource(stackName, spinner, action)
          await new Promise((resolve) => setTimeout(resolve, 500))
          continue
        }

        // Check if deployment failed
        let failed: boolean
        try {
          failed = await this.cloudformation.isStackDeployFailed(stackName)
        } catch (err) {
          if (action === Action.Delete) {
            return
          }
          throw err
        }

        if (failed) {
          const messages = {
            [Action.Deploy]: 'deploy service failed, you should check deploy detail',
            [Action.Update]: 'update service failed, you should check update detail',
            [Action.Delete]: 'delete service failed, you should check delete detail',
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
    action: Action
  ): Promise<boolean> {
    try {
      const status = await this.cloudformation.getResourcesStatus(stackName)

      for (const [resource, resourceStatus] of status) {
        if (action === Action.Deploy) {
          if (resourceStatus === 'CREATE_COMPLETE' || resourceStatus === 'UPDATE_COMPLETE') {
            spinner.text = ` ${resource} => ${resourceStatus}`
            return true
          }
        }
        if (action === Action.Delete) {
          if (resourceStatus === 'DELETE_COMPLETE') {
            spinner.text = ` ${resource} => ${resourceStatus}`
            return true
          }
        }
        if (action === Action.Update) {
          if (resourceStatus === 'UPDATE_COMPLETE') {
            spinner.text = ` ${resource} => ${resourceStatus}`
            return true
          }
        }
      }
    } catch {
      // During creation/deletion, resources may not exist yet
      if (action === Action.Delete || action === Action.Deploy) {
        return true
      }
    }
    return false
  }

  async addUser(stackName: string, user: UserPayload): Promise<void> {
    const lambdaName = await this.getLambdaFunction(stackName)
    const payload = JSON.stringify(user)
    await this.lambda.invoke(lambdaName, payload)
  }

  async storageBucket(stackName: string): Promise<string> {
    return this.cloudformation.getStorageBucket(stackName)
  }

  async getServiceLicense(bucket: string, key: string): Promise<string> {
    return this.s3.readObject(bucket, key)
  }

  async upgradeServiceLicense(bucket: string, key: string, content: string): Promise<void> {
    await this.s3.updateObjectWithContent(bucket, key, content)
  }

  async getLambdaQuota(): Promise<number> {
    return this.quota.getLambdaQuota()
  }

  async setLambdaQuota(newQuota: number): Promise<string> {
    return this.quota.setLambdaQuota(newQuota)
  }
}
