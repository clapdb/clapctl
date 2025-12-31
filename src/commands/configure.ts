import { Command } from 'commander'
import { input, password as passwordPrompt } from '@inquirer/prompts'
import { loadClapDBCredential } from '../credentials'
import { error, mask } from '../utils'

export const configureCommand = new Command('configure')
  .description('Configure AWS or ClapDB credentials')
  .argument('<target>', 'Target to configure: aws or clapdb')
  .option('-n, --stack-name <name>', 'Deployment stack name', 'clapdb-stack')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl configure aws --profile default
  $ clapctl configure clapdb --stack-name clapdb-stack
`
  )
  .action(async (target: string, options: { stackName: string }) => {
    const profile = configureCommand.parent?.opts().profile ?? 'default'

    if (target === 'aws') {
      await handleAWS(profile)
    } else if (target === 'clapdb') {
      await handleClapDB(options.stackName)
    } else {
      error('Only aws and clapdb are supported now.')
    }
  })

async function handleAWS(profile: string): Promise<void> {
  console.log(`Configuring AWS credentials for profile: ${profile}`)
  console.log('Please use "aws configure" command to configure AWS credentials.')
  console.log(`  aws configure --profile ${profile}`)
}

async function handleClapDB(stackName: string): Promise<void> {
  try {
    const credential = await loadClapDBCredential(stackName)

    credential.dataApiEndpoint = await readConfigValue(
      'Data API URL Endpoint',
      credential.dataApiEndpoint,
      false
    )

    credential.licenseApiEndpoint = await readConfigValue(
      'License API URL Endpoint',
      credential.licenseApiEndpoint,
      false
    )

    credential.tenant = await readConfigValue('Tenant', credential.tenant, false)

    credential.database = await readConfigValue('Database', credential.database, false)

    credential.username = await readConfigValue('Username', credential.username, false)

    credential.password = await readConfigValue('Password', credential.password, true)

    if (!credential.isEmpty()) {
      await credential.save()
      console.log(`Credential saved to ${credential.path}`)
    }
  } catch (err) {
    error(`Configure ClapDB error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function readConfigValue(
  prompt: string,
  currentValue: string,
  needMask: boolean
): Promise<string> {
  const displayValue = currentValue ? (needMask ? mask(currentValue) : currentValue) : 'None'

  const promptFn = needMask ? passwordPrompt : input
  const newValue = await promptFn({
    message: `${prompt} [${displayValue}]:`,
  })

  return newValue || currentValue
}
