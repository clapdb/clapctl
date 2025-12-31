import { Command } from 'commander'
import { loadClapDBCredential, validateAWSCredentials } from '../credentials'
import { AWSService } from '../services/aws'
import { ClapDBEngine } from '../services/clapdb'
import { error, success, warning } from '../utils'

export const doctorCommand = new Command('doctor')
  .description('Diagnose common issues')
  .option('-n, --stack-name <name>', 'Deployment stack name', 'clapdb-stack')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl doctor -n clapdb-stack
`,
  )
  .action(async (options) => {
    const profile = doctorCommand.parent?.opts().profile ?? 'default'
    const verbose = doctorCommand.parent?.opts().verbose ?? false

    console.log('Running diagnostic checks...')
    console.log()

    let allPassed = true

    // 1. Check ClapDB credential
    console.log('ClapDB Credential:')
    try {
      const clapdbCredential = await loadClapDBCredential(options.stackName)
      if (clapdbCredential.isValid()) {
        success('  Check ClapDB credential pass')
        if (verbose) {
          console.log(`    Endpoint: ${clapdbCredential.dataApiEndpoint}`)
          console.log(`    User: ${clapdbCredential.username}`)
          console.log(`    Tenant: ${clapdbCredential.tenant}`)
          console.log(`    Database: ${clapdbCredential.database}`)
        }
      } else {
        error(`  Invalid ClapDB credential: ${options.stackName}`)
        warning('  Check ~/.clapdb/credentials')
        warning(`  Run: clapctl configure clapdb -n ${options.stackName}`)
        allPassed = false
      }
    } catch (err) {
      error(`  ClapDB credential check failed: ${err instanceof Error ? err.message : String(err)}`)
      warning(`  Run: clapctl configure clapdb -n ${options.stackName}`)
      allPassed = false
    }
    console.log()

    // 2. Check AWS credential
    console.log('AWS Credential:')
    try {
      const isValid = await validateAWSCredentials(profile)
      if (isValid) {
        success(`  Check AWS ${profile} profile's credential pass`)
      } else {
        error(`  AWS credentials are invalid for profile: ${profile}`)
        warning(`  Run: aws configure --profile ${profile}`)
        allPassed = false
      }
    } catch (err) {
      error(`  AWS credentials check failed: ${err instanceof Error ? err.message : String(err)}`)
      warning(`  Run: aws configure --profile ${profile}`)
      allPassed = false
    }
    console.log()

    // 3. Check AWS config
    console.log('AWS Config:')
    try {
      const awsService = await AWSService.create(profile)
      success(`  Check AWS ${profile} profile's config pass`)
      if (verbose) {
        console.log(`    Region: ${awsService.region}`)
      }

      // 4. Check storage bucket
      console.log()
      console.log('Storage Bucket:')
      try {
        const bucketName = await awsService.storageBucket(options.stackName)
        if (bucketName) {
          success(`  Storage bucket found: ${bucketName}`)
        } else {
          warning(`  Storage bucket not found for stack: ${options.stackName}`)
        }
      } catch (err) {
        error(`  Get storage bucket failed: ${err instanceof Error ? err.message : String(err)}`)
        allPassed = false
      }

      // 5. Check license
      console.log()
      console.log('License:')
      try {
        const clapdbCredential = await loadClapDBCredential(options.stackName)
        if (clapdbCredential.isValid()) {
          const engine = new ClapDBEngine(clapdbCredential)
          const licenseDetail = await engine.getLicenseDetail()
          success('  Check ClapDB license pass')
          if (verbose) {
            console.log(`    Type: ${licenseDetail.type}`)
            console.log(`    Concurrent: ${licenseDetail.concurrent}`)
            console.log(`    Expire: ${licenseDetail.expire}`)
          }
        } else {
          warning('  Skipping license check (no valid credential)')
        }
      } catch (err) {
        error(`  License check failed: ${err instanceof Error ? err.message : String(err)}`)
        warning(`  Run: clapctl license --upgrade -n ${options.stackName}`)
        allPassed = false
      }
    } catch (err) {
      error(`  AWS config check failed: ${err instanceof Error ? err.message : String(err)}`)
      warning('  Check ~/.aws/config')
      allPassed = false
    }

    console.log()
    if (allPassed) {
      success('Everything looks good :-)')
    } else {
      error('Some checks failed. Please review the errors above.')
      process.exit(1)
    }
  })
