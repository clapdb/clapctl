import { Command } from 'commander'
import { loadClapDBCredential } from '../credentials'
import { error } from '../utils'

export const sqlCommand = new Command('sql')
  .description('Execute SQL query on ClapDB')
  .argument('[query]', 'SQL query to execute')
  .option('-n, --stack-name <name>', 'Stack name', 'clapdb-stack')
  .option('--local', 'Query from local deployment')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl sql "SELECT * FROM users LIMIT 10" -n clapdb-stack
  $ clapctl sql "SHOW TABLES"
`
  )
  .action(async (query: string | undefined, options: { stackName: string; local?: boolean }) => {
    if (!query) {
      sqlCommand.help()
      return
    }

    try {
      const credential = await loadClapDBCredential(options.stackName)

      if (!credential.isValid()) {
        error(`Credential for stack '${options.stackName}' not found or invalid.`)
        error('Run: clapctl configure clapdb -n ' + options.stackName)
        return
      }

      // Execute SQL query
      const response = await fetch(credential.dataApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant': credential.tenant,
          'X-Database': credential.database,
          'X-Username': credential.username,
          'X-Password': credential.password,
        },
        body: JSON.stringify({ sql: query }),
      })

      if (!response.ok) {
        const text = await response.text()
        error(`SQL query failed: ${response.status} ${text}`)
        return
      }

      const result = await response.json()
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      error(`SQL error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })
