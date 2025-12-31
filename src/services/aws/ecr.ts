import { ECRClient, DescribeImagesCommand } from '@aws-sdk/client-ecr'
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types'

export class ECRService {
  private client: ECRClient

  constructor(
    public readonly region: string,
    credentials?: AwsCredentialIdentityProvider
  ) {
    this.client = new ECRClient({ region, credentials })
  }

  async getLatestImage(repositoryName: string): Promise<string> {
    const command = new DescribeImagesCommand({
      repositoryName,
      filter: { tagStatus: 'TAGGED' },
    })

    const response = await this.client.send(command)

    if (!response.imageDetails?.length) {
      throw new Error(`No images found in repository ${repositoryName}`)
    }

    // Sort by push date and get the latest
    const sortedImages = response.imageDetails.sort((a, b) => {
      const dateA = a.imagePushedAt?.getTime() ?? 0
      const dateB = b.imagePushedAt?.getTime() ?? 0
      return dateB - dateA
    })

    const latestImage = sortedImages[0]
    const tag = latestImage.imageTags?.[0]

    if (!tag) {
      throw new Error(`Latest image has no tag`)
    }

    return tag
  }
}
