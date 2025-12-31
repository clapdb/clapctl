import {
  GetServiceQuotaCommand,
  RequestServiceQuotaIncreaseCommand,
  ServiceQuotasClient,
} from '@aws-sdk/client-service-quotas'
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types'

const LAMBDA_SERVICE_CODE = 'lambda'
const LAMBDA_CONCURRENT_EXECUTIONS_QUOTA = 'L-B99A9384'

export class QuotaService {
  private client: ServiceQuotasClient

  constructor(
    public readonly region: string,
    credentials?: AwsCredentialIdentityProvider,
  ) {
    this.client = new ServiceQuotasClient({ region, credentials })
  }

  async getLambdaQuota(): Promise<number> {
    const command = new GetServiceQuotaCommand({
      ServiceCode: LAMBDA_SERVICE_CODE,
      QuotaCode: LAMBDA_CONCURRENT_EXECUTIONS_QUOTA,
    })

    const response = await this.client.send(command)
    return response.Quota?.Value ?? 0
  }

  async setLambdaQuota(newQuota: number): Promise<string> {
    const command = new RequestServiceQuotaIncreaseCommand({
      ServiceCode: LAMBDA_SERVICE_CODE,
      QuotaCode: LAMBDA_CONCURRENT_EXECUTIONS_QUOTA,
      DesiredValue: newQuota,
    })

    const response = await this.client.send(command)
    return response.RequestedQuota?.Id ?? ''
  }
}
