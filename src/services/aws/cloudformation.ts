import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  GetTemplateCommand,
  type Parameter,
  type Stack,
  UpdateStackCommand,
} from '@aws-sdk/client-cloudformation'
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import type { DeployConfiguration } from '../../schemas'

export interface CloudFormationStack {
  name: string
  status: string
  createdAt: Date
}

const PARAMETER_NAMES = {
  stackName: 'StackName',
  arch: 'Arch',
  artifactsBucket: 'ArtifactsBucket',
  clapdbVersion: 'ClapDBVersion',
  storageBucket: 'StorageBucket',
  initLambda: 'ClapDBInitLambda',
  lambdaMemorySize: 'LambdaMemorySize',
  dispatcherMemorySize: 'DispatcherMemorySize',
  reducerMemorySize: 'ReducerMemorySize',
  workerMemorySize: 'WorkerMemorySize',
  enablePrivateVpc: 'EnablePrivateVPC',
  enablePrivateEndpoint: 'EnablePrivateEndpoint',
  enableLogging: 'EnableLogging',
  dataApiUrl: 'ClapDataApiURL',
  licenseApiUrl: 'ClapLicenseApiURL',
} as const

export class CloudFormationService {
  private client: CloudFormationClient
  private outputs: Map<string, string> = new Map()

  constructor(
    public readonly region: string,
    credentials?: AwsCredentialIdentityProvider,
  ) {
    this.client = new CloudFormationClient({ region, credentials })
  }

  async listClapDBStacks(): Promise<CloudFormationStack[]> {
    const command = new DescribeStacksCommand({})
    const response = await this.client.send(command)

    const stacks: CloudFormationStack[] = []
    for (const stack of response.Stacks ?? []) {
      const isClapDB = stack.Tags?.some((tag) => tag.Key === 'Vendor' && tag.Value === 'ClapDB')
      if (isClapDB && stack.StackName && stack.StackStatus && stack.CreationTime) {
        stacks.push({
          name: stack.StackName,
          status: stack.StackStatus,
          createdAt: stack.CreationTime,
        })
      }
    }
    return stacks
  }

  async createStack(name: string, config: DeployConfiguration): Promise<string> {
    console.log(`Deploy stack: ${name} with version: ${config.clapdbVersion} arch: ${config.arch}`)

    const command = new CreateStackCommand({
      StackName: name,
      TemplateBody: config.templateBody,
      Capabilities: ['CAPABILITY_IAM'],
      Parameters: [
        { ParameterKey: PARAMETER_NAMES.stackName, ParameterValue: name },
        { ParameterKey: PARAMETER_NAMES.arch, ParameterValue: config.arch },
        { ParameterKey: PARAMETER_NAMES.artifactsBucket, ParameterValue: config.artifactsBucket },
        { ParameterKey: PARAMETER_NAMES.clapdbVersion, ParameterValue: config.clapdbVersion },
        {
          ParameterKey: PARAMETER_NAMES.lambdaMemorySize,
          ParameterValue: String(config.lambdaMemorySize),
        },
        {
          ParameterKey: PARAMETER_NAMES.enablePrivateVpc,
          ParameterValue: String(config.enablePrivateVpc),
        },
        {
          ParameterKey: PARAMETER_NAMES.enablePrivateEndpoint,
          ParameterValue: String(config.enablePrivateEndpoint),
        },
        {
          ParameterKey: PARAMETER_NAMES.enableLogging,
          ParameterValue: String(config.enableLogging),
        },
      ],
      Tags: [{ Key: 'Vendor', Value: 'ClapDB' }],
    })

    const response = await this.client.send(command)
    return response.StackId ?? ''
  }

  async updateStack(name: string, config: DeployConfiguration): Promise<string> {
    console.log(`Update stack: ${name} to version: ${config.clapdbVersion} arch: ${config.arch}`)

    let templateBody = config.templateBody
    if (!templateBody) {
      templateBody = await this.getTemplateBody(name)
    }

    const command = new UpdateStackCommand({
      StackName: name,
      TemplateBody: templateBody,
      Capabilities: ['CAPABILITY_NAMED_IAM'],
      Parameters: [
        { ParameterKey: PARAMETER_NAMES.stackName, ParameterValue: name },
        { ParameterKey: PARAMETER_NAMES.arch, UsePreviousValue: true },
        { ParameterKey: PARAMETER_NAMES.artifactsBucket, UsePreviousValue: true },
        { ParameterKey: PARAMETER_NAMES.clapdbVersion, ParameterValue: config.clapdbVersion },
        { ParameterKey: PARAMETER_NAMES.enablePrivateVpc, UsePreviousValue: true },
        { ParameterKey: PARAMETER_NAMES.enablePrivateEndpoint, UsePreviousValue: true },
        {
          ParameterKey: PARAMETER_NAMES.lambdaMemorySize,
          ParameterValue: String(config.lambdaMemorySize),
        },
        {
          ParameterKey: PARAMETER_NAMES.dispatcherMemorySize,
          ParameterValue: String(config.dispatcherMemorySize),
        },
        {
          ParameterKey: PARAMETER_NAMES.reducerMemorySize,
          ParameterValue: String(config.reducerMemorySize),
        },
        {
          ParameterKey: PARAMETER_NAMES.workerMemorySize,
          ParameterValue: String(config.workerMemorySize),
        },
        {
          ParameterKey: PARAMETER_NAMES.enableLogging,
          ParameterValue: String(config.enableLogging),
        },
      ],
      Tags: [{ Key: 'Vendor', Value: 'ClapDB' }],
      UsePreviousTemplate: false,
    })

    const response = await this.client.send(command)
    return response.StackId ?? ''
  }

  async deleteStack(name: string): Promise<void> {
    const command = new DeleteStackCommand({ StackName: name })
    await this.client.send(command)
  }

  async getStackStatus(stackName: string): Promise<string> {
    const command = new DescribeStacksCommand({ StackName: stackName })
    const response = await this.client.send(command)

    if (!response.Stacks?.length) {
      throw new Error(`Stack '${stackName}' not found`)
    }

    return response.Stacks[0].StackStatus ?? ''
  }

  async getStackParameters(stackName: string): Promise<Parameter[]> {
    const command = new DescribeStacksCommand({ StackName: stackName })
    const response = await this.client.send(command)

    if (!response.Stacks?.length) {
      throw new Error(`Stack '${stackName}' not found`)
    }

    return response.Stacks[0].Parameters ?? []
  }

  async hasStack(stackName: string): Promise<boolean> {
    try {
      const command = new DescribeStacksCommand({ StackName: stackName })
      const response = await this.client.send(command)
      return (response.Stacks?.length ?? 0) > 0
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ValidationError') {
        return false
      }
      throw err
    }
  }

  async getTemplateBody(stackName: string): Promise<string> {
    const command = new GetTemplateCommand({ StackName: stackName })
    const response = await this.client.send(command)
    return response.TemplateBody ?? ''
  }

  async getOutputs(stackName: string): Promise<Map<string, string>> {
    const command = new DescribeStacksCommand({ StackName: stackName })
    const response = await this.client.send(command)

    this.outputs.clear()
    for (const stack of response.Stacks ?? []) {
      for (const output of stack.Outputs ?? []) {
        if (output.OutputKey && output.OutputValue) {
          this.outputs.set(output.OutputKey, output.OutputValue)
        }
      }
    }
    return this.outputs
  }

  async getDataApiUrl(stackName: string): Promise<string> {
    if (this.outputs.size === 0) {
      await this.getOutputs(stackName)
    }
    return this.outputs.get(PARAMETER_NAMES.dataApiUrl) ?? ''
  }

  async getLicenseApiUrl(stackName: string): Promise<string> {
    if (this.outputs.size === 0) {
      await this.getOutputs(stackName)
    }
    return this.outputs.get(PARAMETER_NAMES.licenseApiUrl) ?? ''
  }

  async getInitLambdaName(stackName: string): Promise<string> {
    if (this.outputs.size === 0) {
      await this.getOutputs(stackName)
    }
    return this.outputs.get(PARAMETER_NAMES.initLambda) ?? ''
  }

  async getResourcesStatus(stackName: string): Promise<Map<string, string>> {
    const command = new DescribeStackResourcesCommand({ StackName: stackName })
    const response = await this.client.send(command)

    const status = new Map<string, string>()
    for (const resource of response.StackResources ?? []) {
      if (resource.LogicalResourceId && resource.ResourceStatus) {
        status.set(resource.LogicalResourceId, resource.ResourceStatus)
      }
    }
    return status
  }

  async getResources(stackName: string): Promise<Map<string, string>> {
    const command = new DescribeStackResourcesCommand({ StackName: stackName })
    const response = await this.client.send(command)

    const resources = new Map<string, string>()
    for (const resource of response.StackResources ?? []) {
      if (resource.LogicalResourceId && resource.PhysicalResourceId) {
        resources.set(resource.LogicalResourceId, resource.PhysicalResourceId)
      }
    }
    return resources
  }

  async getStorageBucket(stackName: string): Promise<string> {
    const resources = await this.getResources(stackName)
    return resources.get(PARAMETER_NAMES.storageBucket) ?? ''
  }

  async isStackDeployCompleted(stackName: string): Promise<boolean> {
    const terminalStates = new Set([
      'CREATE_COMPLETE',
      'UPDATE_COMPLETE',
      'DELETE_COMPLETE',
      'UPDATE_ROLLBACK_COMPLETE',
    ])

    const status = await this.getStackStatus(stackName)
    return terminalStates.has(status)
  }

  async isStackDeployFailed(stackName: string): Promise<boolean> {
    const failedStates = new Set([
      'CREATE_FAILED',
      'UPDATE_FAILED',
      'DELETE_FAILED',
      'ROLLBACK_FAILED',
      'UPDATE_ROLLBACK_FAILED',
      'ROLLBACK_COMPLETE',
      'UPDATE_ROLLBACK_COMPLETE',
    ])

    const status = await this.getStackStatus(stackName)
    return failedStates.has(status)
  }

  async isWorkingInProgress(stackName: string): Promise<boolean> {
    const inProgressStates = new Set([
      'CREATE_IN_PROGRESS',
      'UPDATE_IN_PROGRESS',
      'DELETE_IN_PROGRESS',
    ])

    try {
      const status = await this.getStackStatus(stackName)
      return inProgressStates.has(status)
    } catch {
      return false
    }
  }
}
