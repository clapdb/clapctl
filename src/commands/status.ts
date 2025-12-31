import { Command } from 'commander'
import { AWSService } from '../services/aws'
import { error } from '../utils'

export const statusCommand = new Command('status')
  .description('Show ClapDB service deployment status')
  .option('--stack-id <id>', 'Stack id to check status')
  .option('-n, --stack-name <name>', 'Stack name to check status')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl status -n clapdb-stack
`,
  )
  .action(async (options: { stackId?: string; stackName?: string }) => {
    const profile = statusCommand.parent?.opts().profile ?? 'default'

    // Get stack identifier
    const stackId = options.stackId ?? options.stackName
    if (!stackId) {
      statusCommand.help()
      return
    }

    try {
      const awsService = await AWSService.create(profile)

      const cloudformationUrl = awsService.getCloudformationUrl(stackId)
      console.log(`Deployment details: ${cloudformationUrl}`)

      const status = await awsService.getStackStatus(stackId)
      console.log(`ClapDB service deployment status: ${status}`)

      const dataApiUrl = await awsService.getDataApiUrl(stackId)
      const licenseApiUrl = await awsService.getLicenseApiUrl(stackId)

      console.log()
      console.log(`Data API URL Endpoint:    ${dataApiUrl}`)
      console.log(`License API URL Endpoint: ${licenseApiUrl}`)
    } catch (err) {
      error(`Status error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
