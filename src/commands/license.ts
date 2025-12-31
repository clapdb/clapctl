import { Command } from 'commander'
import { AWSService } from '../services/aws'
import { loadClapDBCredential } from '../credentials'
import { success, error } from '../utils'

export const licenseCommand = new Command('license')
  .description('Manage ClapDB license')
  .argument('<action>', 'Action: show, upgrade')
  .option('-n, --stack-name <name>', 'Stack name')
  .option('-l, --license <license>', 'New license key (for upgrade)')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl license show -n clapdb-stack
  $ clapctl license upgrade -n clapdb-stack -l "NEW_LICENSE_KEY"
`
  )
  .action(async (action: string, options: { stackName?: string; license?: string }) => {
    const profile = licenseCommand.parent?.opts().profile ?? 'default'

    if (!options.stackName) {
      licenseCommand.help()
      return
    }

    try {
      const awsService = await AWSService.create(profile)
      const credential = await loadClapDBCredential(options.stackName)

      if (!credential.isValid()) {
        error(`Credential for stack '${options.stackName}' not found.`)
        return
      }

      const bucket = await awsService.storageBucket(options.stackName)

      if (action === 'show') {
        const license = await awsService.getServiceLicense(bucket, 'license.json')
        console.log('Current License:')
        console.log(license)
      } else if (action === 'upgrade') {
        if (!options.license) {
          error('License key is required for upgrade. Use -l or --license option.')
          return
        }

        await awsService.upgradeServiceLicense(bucket, 'license.json', options.license)
        success('License upgraded successfully.')
      } else {
        error('Unknown action. Supported actions: show, upgrade')
      }
    } catch (err) {
      error(`License error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
