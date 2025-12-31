import { Command } from 'commander'
import { AWSService, Action } from '../services/aws'
import { type DeployConfiguration, getArtifactsBucket } from '../schemas'
import { success, error, spinner } from '../utils'

export const updateCommand = new Command('update')
  .description('Update ClapDB service deployment')
  .option('-n, --stack-name <name>', 'Stack name to update')
  .option('--lambda-memory-size <size>', 'Lambda memory size(MB)')
  .option('--dispatcher-memory-size <size>', 'Dispatcher memory size(MB)')
  .option('--reducer-memory-size <size>', 'Reducer memory size(MB)')
  .option('--worker-memory-size <size>', 'Worker memory size(MB)')
  .option('--logging', 'Enable API Gateway logging')
  .option('-c, --commit <commit>', 'ClapDB version: latest or specific commit hash')
  .option('--update-template', 'Update CloudFormation template')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl update -n clapdb-stack
  $ clapctl update -n clapdb-stack --lambda-memory-size 4096
  $ clapctl update -n clapdb-stack -c latest
`
  )
  .action(async (options) => {
    const profile = updateCommand.parent?.opts().profile ?? 'default'

    if (!options.stackName) {
      updateCommand.help()
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

      console.log(`Update ClapDB service in ${awsService.region} region.`)

      // Build configuration with defaults from current stack
      const config: DeployConfiguration = {
        stackName: options.stackName,
        arch: 'x86_64', // Will use previous value
        lambdaMemorySize: options.lambdaMemorySize
          ? Number.parseInt(options.lambdaMemorySize)
          : 3008,
        dispatcherMemorySize: options.dispatcherMemorySize
          ? Number.parseInt(options.dispatcherMemorySize)
          : 3008,
        reducerMemorySize: options.reducerMemorySize
          ? Number.parseInt(options.reducerMemorySize)
          : 3008,
        workerMemorySize: options.workerMemorySize
          ? Number.parseInt(options.workerMemorySize)
          : 3008,
        enablePrivateVpc: false, // Will use previous value
        enablePrivateEndpoint: false, // Will use previous value
        enableLogging: options.logging ?? false,
        clapdbVersion: options.commit,
        artifactsBucket: getArtifactsBucket(awsService.region),
        updateBuiltinTemplate: options.updateTemplate ?? false,
      }

      // Update the stack
      const stackId = await awsService.updateService(options.stackName, config)

      const cloudformationUrl = awsService.getCloudformationUrl(stackId)
      console.log(`Deployment details: ${cloudformationUrl}`)

      // Watch update progress
      const spin = spinner('Updating ClapDB service...')
      spin.start()

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        spin.stop()
        console.log('Update interrupted, exited.')
        process.exit(1)
      })

      await awsService.watchService(options.stackName, spin, Action.Update)

      success('ClapDB service updated.')
    } catch (err) {
      error(`Update error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
