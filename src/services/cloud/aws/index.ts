/**
 * AWS Cloud Provider Module
 *
 * This module provides the AWS implementation of the CloudProvider interface.
 * It uses AWS services including:
 * - CloudFormation for infrastructure management
 * - S3 for object storage
 * - Lambda for serverless compute
 * - ECR for container registry
 * - Service Quotas for quota management
 */

export { AWSCloudProvider } from './provider'
export { CloudFormationService, type CloudFormationStack } from './cloudformation'
export { S3Service } from './s3'
export { LambdaService } from './lambda'
export { ECRService } from './ecr'
export { QuotaService } from './quota'

// Register AWS provider on import
import { registerCloudProvider } from '../provider'
import { AWSCloudProvider } from './provider'

registerCloudProvider('aws', AWSCloudProvider.create)
