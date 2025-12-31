import { z } from 'zod'

export const DeployConfigurationSchema = z.object({
  stackName: z.string().min(1),
  arch: z.enum(['x86_64', 'arm64']).default('x86_64'),
  lambdaMemorySize: z.number().min(128).max(10240).default(3008),
  dispatcherMemorySize: z.number().min(128).max(10240).default(3008),
  reducerMemorySize: z.number().min(128).max(10240).default(3008),
  workerMemorySize: z.number().min(128).max(10240).default(3008),
  enablePrivateVpc: z.boolean().default(false),
  enablePrivateEndpoint: z.boolean().default(false),
  enableLogging: z.boolean().default(false),
  clapdbVersion: z.string().optional(),
  artifactsBucket: z.string().optional(),
  templateBody: z.string().optional(),
  updateBuiltinTemplate: z.boolean().default(false),
})

export type DeployConfiguration = z.infer<typeof DeployConfigurationSchema>

export const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'sa-east-1',
  'cn-north-1',
  'cn-northwest-1',
] as const

export type AWSRegion = (typeof AWS_REGIONS)[number]

export function getArtifactsBucket(region: string): string {
  return `clapdb-pkgs-${region}`
}
