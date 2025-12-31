import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types'

export class LambdaService {
  private client: LambdaClient

  constructor(
    public readonly region: string,
    credentials?: AwsCredentialIdentityProvider,
  ) {
    this.client = new LambdaClient({ region, credentials })
  }

  async invoke(functionName: string, payload: string): Promise<string> {
    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: new TextEncoder().encode(payload),
    })

    const response = await this.client.send(command)

    if (response.FunctionError) {
      const errorPayload = response.Payload ? new TextDecoder().decode(response.Payload) : ''
      throw new Error(`Lambda function error: ${response.FunctionError} - ${errorPayload}`)
    }

    return response.Payload ? new TextDecoder().decode(response.Payload) : ''
  }
}
