import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types'

export class S3Service {
  private client: S3Client

  constructor(
    public readonly region: string,
    credentials?: AwsCredentialIdentityProvider,
  ) {
    this.client = new S3Client({ region, credentials })
  }

  async deleteBucket(bucketName: string): Promise<void> {
    // First, delete all objects in the bucket
    await this.deleteAllObjects(bucketName)

    // Then delete the bucket
    const command = new DeleteBucketCommand({ Bucket: bucketName })
    await this.client.send(command)
  }

  private async deleteAllObjects(bucketName: string): Promise<void> {
    const listCommand = new ListObjectsV2Command({ Bucket: bucketName })
    const response = await this.client.send(listCommand)

    if (!response.Contents?.length) {
      return
    }

    const objects = response.Contents.filter((obj): obj is { Key: string } => Boolean(obj.Key)).map(
      (obj) => ({ Key: obj.Key }),
    )

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: objects },
    })
    await this.client.send(deleteCommand)

    // If there are more objects, continue deleting
    if (response.IsTruncated) {
      await this.deleteAllObjects(bucketName)
    }
  }

  async readObject(bucket: string, key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    const response = await this.client.send(command)
    return (await response.Body?.transformToString()) ?? ''
  }

  async updateObjectWithContent(bucket: string, key: string, content: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
    })
    await this.client.send(command)
  }

  async listObjects(bucket: string, prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
    const response = await this.client.send(command)
    return (
      response.Contents?.map((obj) => obj.Key).filter((key): key is string => Boolean(key)) ?? []
    )
  }

  async getLatestTag(bucket: string): Promise<string> {
    // Read the LATEST_TAG file from the bucket
    try {
      const content = await this.readObject(bucket, 'LATEST_TAG')
      return content.trim()
    } catch {
      throw new Error(`Failed to get latest tag from bucket ${bucket}`)
    }
  }

  async getLatestHash(bucket: string): Promise<string> {
    // Read the LATEST_HASH file from the bucket
    try {
      const content = await this.readObject(bucket, 'LATEST_HASH')
      return content.trim()
    } catch {
      throw new Error(`Failed to get latest hash from bucket ${bucket}`)
    }
  }

  async hasArtifact(bucket: string, version: string, arch: string): Promise<boolean> {
    const key = `${version}/${arch}/bootstrap.zip`
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
      await this.client.send(command)
      return true
    } catch {
      return false
    }
  }
}
