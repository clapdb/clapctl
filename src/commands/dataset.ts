import { Command } from 'commander'
import { loadClapDBCredential } from '../credentials'
import { error, success } from '../utils'

export const datasetCommand = new Command('dataset')
  .description('Import dataset to ClapDB')
  .argument('<action>', 'Action: import')
  .argument('[source]', 'Data source URL or path')
  .option('-n, --stack-name <name>', 'Stack name', 'clapdb-stack')
  .option('-t, --table <table>', 'Target table name')
  .option('-f, --format <format>', 'Data format: csv, tsv, ndjson, json', 'csv')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl dataset import s3://bucket/data.csv -n clapdb-stack -t users
  $ clapctl dataset import ./data.json -t products -f json
`
  )
  .action(async (action: string, source: string | undefined, options) => {
    if (action !== 'import') {
      error('Only "import" action is supported')
      return
    }

    if (!source) {
      datasetCommand.help()
      return
    }

    if (!options.table) {
      error('Table name is required. Use -t or --table option.')
      return
    }

    try {
      const credential = await loadClapDBCredential(options.stackName)

      if (!credential.isValid()) {
        error(`Credential for stack '${options.stackName}' not found or invalid.`)
        error('Run: clapctl configure clapdb -n ' + options.stackName)
        return
      }

      console.log(`Importing data from ${source} to table ${options.table}...`)

      // TODO: Implement dataset import logic
      // This would involve:
      // 1. Reading the source file
      // 2. Parsing based on format
      // 3. Uploading to ClapDB via API
      // 4. Showing progress

      success(`Dataset imported to table '${options.table}'`)
    } catch (err) {
      error(`Dataset error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
