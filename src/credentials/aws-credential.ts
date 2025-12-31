import { fromIni } from '@aws-sdk/credential-providers'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'

export interface AWSCredentialConfig {
  profile: string
  region?: string
}

export async function getAWSCredentials(config: AWSCredentialConfig) {
  return fromIni({ profile: config.profile })
}

export async function validateAWSCredentials(profile: string): Promise<boolean> {
  try {
    const credentials = fromIni({ profile })
    const client = new STSClient({ credentials })
    await client.send(new GetCallerIdentityCommand({}))
    return true
  } catch {
    return false
  }
}

export async function getCallerIdentity(profile: string) {
  const credentials = fromIni({ profile })
  const client = new STSClient({ credentials })
  const response = await client.send(new GetCallerIdentityCommand({}))
  return {
    account: response.Account,
    arn: response.Arn,
    userId: response.UserId,
  }
}
