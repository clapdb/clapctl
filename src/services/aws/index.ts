/**
 * AWS Services Module (Legacy)
 *
 * This module re-exports from the new cloud provider architecture.
 * For new code, prefer importing directly from '../cloud'.
 *
 * @deprecated Use '../cloud' module instead
 */

// Re-export AWS provider as AWSService for backward compatibility
export { AWSCloudProvider as AWSService } from '../cloud/aws'

// Re-export Action as alias for DeployAction
export { DeployAction as Action } from '../cloud'

// Re-export AWS service components
export {
  CloudFormationService,
  type CloudFormationStack,
  ECRService,
  LambdaService,
  QuotaService,
  S3Service,
} from '../cloud/aws'
