import { Command } from 'commander'
import Table from 'cli-table3'
import { AWSService, Action } from '../services/aws'
import { loadClapDBCredential, loadAllCredentials } from '../credentials'
import { type DeployConfiguration, getArtifactsBucket, UserPayloadSchema } from '../schemas'
import { success, error, spinner, generateRandomPassword, isPasswordValid } from '../utils'

export const deployCommand = new Command('deploy')
  .description('Deploy ClapDB service')
  .option('-n, --stack-name <name>', 'Deployment stack name')
  .option('-a, --arch <arch>', 'Architecture: x86_64 or arm64', 'x86_64')
  .option('-l, --list <type>', 'List ClapDB deployment stacks {all|local}')
  .option('-u, --user <user>', 'User name', 'root')
  .option('-p, --password <password>', 'Password')
  .option('-t, --tenant <tenant>', 'Tenant', 'clapdb')
  .option('-d, --database <database>', 'Database name', 'local')
  .option('--lambda-memory-size <size>', 'Lambda memory size(MB)', '3008')
  .option('--dispatcher-memory-size <size>', 'Dispatcher memory size(MB)', '3008')
  .option('--reducer-memory-size <size>', 'Reducer memory size(MB)', '3008')
  .option('--worker-memory-size <size>', 'Worker memory size(MB)', '3008')
  .option('--private-vpc', 'Deploy within private VPC')
  .option('--private-endpoint', 'Deploy within private API Gateway endpoint')
  .option('--logging', 'Enable API Gateway logging')
  .option('-c, --commit <commit>', 'ClapDB commit: latest or specific commit hash')
  .option('--sandbox', 'Run inside sandbox environment')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl deploy -n clapdb-stack
  $ clapctl deploy -n clapdb-stack -u admin -p "MyP@ssw0rd!"
  $ clapctl deploy --list all
`
  )
  .action(async (options) => {
    const profile = deployCommand.parent?.opts().profile ?? 'default'

    try {
      const awsService = await AWSService.create(profile)

      // Handle list flag
      if (options.list) {
        await listDeployments(awsService, options.list === 'local')
        return
      }

      // Require stack name for deployment
      if (!options.stackName) {
        deployCommand.help()
        return
      }

      await deploy(awsService, options)
    } catch (err) {
      error(`Deploy error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

interface DeployOptions {
  stackName: string
  arch: string
  user: string
  password?: string
  tenant: string
  database: string
  lambdaMemorySize: string
  dispatcherMemorySize: string
  reducerMemorySize: string
  workerMemorySize: string
  privateVpc?: boolean
  privateEndpoint?: boolean
  logging?: boolean
  commit?: string
  sandbox?: boolean
}

async function deploy(awsService: AWSService, options: DeployOptions): Promise<void> {
  console.log(`Deploy ClapDB service to ${awsService.region} region now.`)

  // Generate password if not provided
  let password = options.password
  if (!password) {
    password = generateRandomPassword(12)
  }

  if (!isPasswordValid(password)) {
    error(`Password: ${password} is invalid. Must contain lowercase, uppercase, digit, and special character.`)
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

  const user = userResult.data

  // Normalize arch
  let arch = options.arch
  if (arch === 'x86' || arch === 'x64') {
    arch = 'x86_64'
  }

  // Check private endpoint requires private VPC
  if (options.privateEndpoint && !options.privateVpc) {
    error('private endpoint must be used with private-vpc=true')
    return
  }

  const config: DeployConfiguration = {
    stackName: options.stackName,
    arch: arch as 'x86_64' | 'arm64',
    lambdaMemorySize: Number.parseInt(options.lambdaMemorySize),
    dispatcherMemorySize: Number.parseInt(options.dispatcherMemorySize),
    reducerMemorySize: Number.parseInt(options.reducerMemorySize),
    workerMemorySize: Number.parseInt(options.workerMemorySize),
    enablePrivateVpc: options.privateVpc ?? false,
    enablePrivateEndpoint: options.privateEndpoint ?? false,
    enableLogging: options.logging ?? false,
    clapdbVersion: options.commit,
    artifactsBucket: getArtifactsBucket(awsService.region),
  }

  // Deploy the stack
  const stackId = await awsService.deployService(options.stackName, config)

  const cloudformationUrl = awsService.getCloudformationUrl(stackId)
  console.log(`Deployment details: ${cloudformationUrl}`)

  // Watch deployment progress
  const spin = spinner('This will take a while...')
  spin.start()

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    spin.stop()
    console.log('Deployment interrupted, exited.')
    process.exit(1)
  })

  await awsService.watchService(options.stackName, spin, Action.Deploy)

  // Add user
  await awsService.addUser(options.stackName, user)
  success('Add ClapDB user done.')

  // Get API URLs
  const dataApiUrl = await awsService.getDataApiUrl(stackId)
  const licenseApiUrl = await awsService.getLicenseApiUrl(stackId)

  success('ClapDB service deploy done.')

  // Save credentials
  const credential = await loadClapDBCredential(options.stackName)
  credential.dataApiEndpoint = dataApiUrl
  credential.licenseApiEndpoint = licenseApiUrl
  credential.tenant = user.tenant
  credential.database = user.database
  credential.username = user.name
  credential.password = user.password
  credential.sandbox = options.sandbox ?? false

  await credential.save()
  console.log(`Credential saved to ${credential.path}`)
  console.log(credential.toString())
}

async function listDeployments(awsService: AWSService, onlyLocal: boolean): Promise<void> {
  let credentials: Map<string, unknown> | null = null

  if (onlyLocal) {
    credentials = await loadAllCredentials()
  }

  const stacks = await awsService.listClapDBStacks()

  const filteredStacks = onlyLocal
    ? stacks.filter((stack) => credentials?.has(stack.name))
    : stacks

  const table = new Table({
    head: ['Name', 'Status', 'CreateAt'],
  })

  for (const stack of filteredStacks) {
    const readableStatus = stack.status.toLowerCase().replace(/_/g, ' ')
    table.push([
      stack.name,
      readableStatus,
      stack.createdAt.toISOString().replace('T', ' ').slice(0, 19),
    ])
  }

  console.log(table.toString())
}
