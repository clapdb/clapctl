import { Command } from 'commander'
import { validateAWSCredentials } from '../credentials'
import { success, error, warning } from '../utils'

export const doctorCommand = new Command('doctor')
  .description('Run diagnostic checks')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl doctor
`
  )
  .action(async () => {
    const profile = doctorCommand.parent?.opts().profile ?? 'default'

    console.log('Running diagnostic checks...')
    console.log()

    // Check Bun version
    console.log('Runtime:')
    console.log(`  Bun version: ${Bun.version}`)
    success('  Bun is available')
    console.log()

    // Check AWS credentials
    console.log('AWS Credentials:')
    console.log(`  Profile: ${profile}`)

    try {
      const isValid = await validateAWSCredentials(profile)
      if (isValid) {
        success('  AWS credentials are valid')
      } else {
        error('  AWS credentials are invalid')
        warning('  Run: aws configure --profile ' + profile)
      }
    } catch (err) {
      error(`  AWS credentials check failed: ${err instanceof Error ? err.message : String(err)}`)
      warning('  Run: aws configure --profile ' + profile)
    }

    console.log()
    console.log('All checks completed.')
  })
