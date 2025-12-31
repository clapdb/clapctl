import { confirm } from '@inquirer/prompts'
import { Command } from 'commander'
import { loadClapDBCredential } from '../credentials'
import { AWSService, Action } from '../services/aws'
import { error, spinner, success } from '../utils'

export const deleteCommand = new Command('delete')
  .description('Delete ClapDB service deployment')
  .option('-n, --stack-name <name>', 'Stack name to delete')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--with-s3', 'Also delete the S3 storage bucket')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl delete -n clapdb-stack
  $ clapctl delete -n clapdb-stack -y --with-s3
`,
  )
  .action(async (options: { stackName?: string; yes?: boolean; withS3?: boolean }) => {
    const profile = deleteCommand.parent?.opts().profile ?? 'default'

    if (!options.stackName) {
      deleteCommand.help()
      return
    }

    try {
      const awsService = await AWSService.create(profile)

      // Check if stack exists
      const exists = await awsService.hasStack(options.stackName)
      if (!exists) {
        error(`Stack '${options.stackName}' not found`)
        return
      }

      // Confirm deletion
      if (!options.yes) {
        const confirmed = await confirm({
          message: `Are you sure you want to delete stack '${options.stackName}'?`,
          default: false,
        })

        if (!confirmed) {
          console.log('Deletion cancelled.')
          return
        }
      }

      // Delete the stack
      const cloudformationUrl = await awsService.deleteService(
        options.stackName,
        options.withS3 ?? false,
      )
      console.log(`Deployment details: ${cloudformationUrl}`)

      // Watch deletion progress
      const spin = spinner('Deleting ClapDB service...')
      spin.start()

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        spin.stop()
        console.log('Deletion interrupted, exited.')
        process.exit(1)
      })

      await awsService.watchService(options.stackName, spin, Action.Delete)

      // Delete local credentials
      const credential = await loadClapDBCredential(options.stackName)
      await credential.delete()

      success('ClapDB service deleted.')
    } catch (err) {
      error(`Delete error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
