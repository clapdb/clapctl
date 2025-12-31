import Table from 'cli-table3'
import { Command } from 'commander'
import { loadClapDBCredential } from '../credentials'
import { AWSService } from '../services/aws'
import { ClapDBEngine, DATASETS, findDataset } from '../services/clapdb'
import { error, spinner, success } from '../utils'

export const datasetCommand = new Command('dataset')
  .description('Import dataset to ClapDB')
  .option('-i, --import <name>', 'Dataset name to import')
  .option('-n, --stack-name <name>', 'Deployment stack name')
  .option('-u, --user <user>', 'User name')
  .option('-p, --password <password>', 'Password')
  .option('-t, --tenant <tenant>', 'Tenant name')
  .option('-d, --database <database>', 'Database name')
  .option('-l, --list', 'List available datasets')
  .option('--skip-create-table', 'Skip table creation')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl dataset --list
  $ clapctl dataset --import line_changes.ndjson -n clapdb-stack
  $ clapctl dataset --import hdfs_logs.ndjson -n clapdb-stack --skip-create-table
`,
  )
  .action(async (options) => {
    // If no import flag, list datasets
    if (!options.import) {
      renderDatasets()
      return
    }

    const profile = datasetCommand.parent?.opts().profile ?? 'default'

    if (!options.stackName) {
      error('Stack name is required. Use -n or --stack-name option.')
      return
    }

    try {
      const awsService = await AWSService.create(profile)

      // Load credential
      const credential = await loadClapDBCredential(options.stackName)

      // Override credential fields if provided
      if (options.user) credential.username = options.user
      if (options.password) credential.password = options.password
      if (options.tenant) credential.tenant = options.tenant
      if (options.database) credential.database = options.database

      if (!credential.isValid()) {
        // Try to get endpoints from CloudFormation
        const dataApiUrl = await awsService.getDataApiUrl(options.stackName)
        const licenseApiUrl = await awsService.getLicenseApiUrl(options.stackName)

        credential.dataApiEndpoint = dataApiUrl
        credential.licenseApiEndpoint = licenseApiUrl
      }

      if (!credential.isValid()) {
        error(`Credential for stack '${options.stackName}' not found or invalid.`)
        error(`Run: clapctl configure clapdb -n ${options.stackName}`)
        return
      }

      console.log(`Locate endpoint: ${credential.dataApiEndpoint} done.`)

      // Find dataset
      const dataset = findDataset(options.import)
      if (!dataset) {
        error(`Dataset '${options.import}' not found.`)
        console.log('Available datasets:')
        renderDatasets()
        return
      }

      const engine = new ClapDBEngine(credential)

      // Step 1: Create table if needed
      console.log(`Located dataset table: ${dataset.table} done.`)

      if (!options.skipCreateTable) {
        console.log('Prepared table sql done.')
        try {
          await engine.createTable(dataset.table, dataset.sql)
          console.log(`Create table: ${dataset.table} done.`)
        } catch (err) {
          if (err instanceof Error && err.message.includes('already exists')) {
            console.log(`Table ${dataset.table} already exists, skipping creation.`)
          } else {
            throw err
          }
        }
      }

      // Step 2: Import data
      console.log(`Import dataset: ${options.import}, This will take a while...`)

      const spin = spinner(`Importing ${dataset.name}...`)
      spin.start()

      const response = await engine.importDataset(dataset, awsService.region)
      spin.stop()

      if (response.reqId) {
        console.log(`Import started with request ID: ${response.reqId}`)

        // Watch progress
        const totalSize = response.ranges.reduce((sum, [start, end]) => sum + (end - start + 1), 0)
        if (totalSize > 0) {
          console.log(`Total size: ${totalSize} bytes`)
          // TODO: Implement progress watching with awsService.watchDataImportProgress
        }
      }

      success('Dataset import initiated.')
      console.log(
        `\nTry to explore dataset like this: $ clapctl sql -n ${options.stackName} --statement "SELECT COUNT(*) FROM ${dataset.table}"`,
      )
    } catch (err) {
      error(`Dataset error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

function renderDatasets(): void {
  const table = new Table({
    head: ['Name', 'Table', 'Rows', 'DiskSpace'],
  })

  for (const dataset of DATASETS) {
    table.push([dataset.name, dataset.table, dataset.rows.toLocaleString(), dataset.diskSpace])
  }

  console.log(table.toString())
}
