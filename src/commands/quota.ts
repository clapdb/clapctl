import { Command } from 'commander'
import { AWSService } from '../services/aws'
import { error, success } from '../utils'

export const quotaCommand = new Command('quota')
  .description('Manage AWS Lambda quota')
  .argument('<action>', 'Action: show, request')
  .option('-v, --value <value>', 'New quota value (for request)')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl quota show
  $ clapctl quota request -v 10000
`,
  )
  .action(async (action: string, options: { value?: string }) => {
    const profile = quotaCommand.parent?.opts().profile ?? 'default'

    try {
      const awsService = await AWSService.create(profile)

      if (action === 'show') {
        const quota = await awsService.getLambdaQuota()
        console.log(`Current Lambda concurrent executions quota: ${quota}`)
      } else if (action === 'request') {
        if (!options.value) {
          error('Quota value is required. Use -v or --value option.')
          return
        }

        const newQuota = Number.parseInt(options.value)
        if (Number.isNaN(newQuota) || newQuota <= 0) {
          error('Invalid quota value. Must be a positive number.')
          return
        }

        const requestId = await awsService.setLambdaQuota(newQuota)
        success(`Quota increase request submitted. Request ID: ${requestId}`)
        console.log('Note: Quota increase requests may take some time to be processed.')
      } else {
        error('Unknown action. Supported actions: show, request')
      }
    } catch (err) {
      error(`Quota error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
