import { Command } from 'commander'
import { UserPayloadSchema } from '../schemas'
import { AWSService } from '../services/aws'
import { error, generateRandomPassword, isPasswordValid, success } from '../utils'

export const userCommand = new Command('user')
  .description('Manage ClapDB users')
  .argument('<action>', 'Action: add')
  .option('-n, --stack-name <name>', 'Stack name')
  .option('-u, --user <user>', 'User name', 'root')
  .option('-p, --password <password>', 'Password')
  .option('-t, --tenant <tenant>', 'Tenant', 'clapdb')
  .option('-d, --database <database>', 'Database name', 'local')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl user add -n clapdb-stack -u admin -p "MyP@ssw0rd!"
`,
  )
  .action(async (action: string, options) => {
    const profile = userCommand.parent?.opts().profile ?? 'default'

    if (action !== 'add') {
      error('Only "add" action is supported')
      return
    }

    if (!options.stackName) {
      userCommand.help()
      return
    }

    try {
      const awsService = await AWSService.create(profile)

      // Generate password if not provided
      let password = options.password
      if (!password) {
        password = generateRandomPassword(12)
        console.log(`Generated password: ${password}`)
      }

      if (!isPasswordValid(password)) {
        error(
          'Password is invalid. Must contain lowercase, uppercase, digit, and special character.',
        )
        return
      }

      // Validate user payload
      const userResult = UserPayloadSchema.safeParse({
        name: options.user,
        password,
        tenant: options.tenant,
        database: options.database,
      })

      if (!userResult.success) {
        error(`Invalid user configuration: ${userResult.error.message}`)
        return
      }

      await awsService.addUser(options.stackName, userResult.data)
      success(`User '${options.user}' added successfully.`)
    } catch (err) {
      error(`User error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
