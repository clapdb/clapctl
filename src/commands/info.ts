import { Command } from 'commander'
import { loadClapDBCredential } from '../credentials'
import { error } from '../utils'

export const infoCommand = new Command('info')
  .description('Show ClapDB CLI and service information')
  .option('-n, --stack-name <name>', 'Stack name')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl info
  $ clapctl info -n clapdb-stack
`
  )
  .action(async (options: { stackName?: string }) => {
    console.log('ClapDB CLI Information')
    console.log('======================')
    console.log(`Version: 0.1.0`)
    console.log(`Runtime: Bun ${Bun.version}`)
    console.log()

    if (options.stackName) {
      try {
        const credential = await loadClapDBCredential(options.stackName)

        if (credential.isValid()) {
          console.log(`Stack: ${options.stackName}`)
          console.log(`Data API: ${credential.dataApiEndpoint}`)
          console.log(`License API: ${credential.licenseApiEndpoint}`)
          console.log(`Tenant: ${credential.tenant}`)
          console.log(`Database: ${credential.database}`)
          console.log(`Username: ${credential.username}`)
        } else {
          error(`Stack '${options.stackName}' not configured.`)
        }
      } catch (err) {
        error(`Info error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  })
