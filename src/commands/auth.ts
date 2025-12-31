import { Command } from 'commander'
import { Auth0Service } from '../services/clapdb'
import { error, success } from '../utils'

const cmd = new Command('auth')
  .description('Authenticate with ClapDB')
  .option('--sandbox', 'Use sandbox environment')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl auth
`,
  )
  .action(async (options) => {
    try {
      const auth0 = new Auth0Service(options.sandbox ?? false)

      const token = await auth0.login()

      success('Authentication successful!')
      console.log(`Access token: ${token.access_token.substring(0, 20)}...`)

      if (token.expires_in) {
        console.log(`Token expires in: ${token.expires_in} seconds`)
      }
    } catch (err) {
      error(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

// Hide command from normal users (internal/development use)
;(cmd as unknown as { _hidden: boolean })._hidden = true

export const authCommand = cmd
