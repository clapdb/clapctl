import Table from 'cli-table3'
import { Command } from 'commander'
import { loadClapDBCredential } from '../credentials'
import { AWSService } from '../services/aws'
import {
  ClapDBEngine,
  type RegressCase,
  isInSubset,
  loadDefaultRegressionList,
  loadRegressionList,
  parseSubset,
} from '../services/clapdb'
import { error, success } from '../utils'

export const regressCommand = new Command('regress')
  .description('Run regression tests on ClapDB service')
  .option('-n, --stack-name <name>', 'Deployment stack name', 'clapdb-stack')
  .option('--detail', 'Show regression details, SQL etc.')
  .option('-r, --run', 'Run regression')
  .option('-s, --subset <subset>', 'Only run subset of regression. eg: 0,2,4')
  .option('-f, --regression-file <file>', 'Regression file, use builtin if empty')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl regress -n clapdb-stack --detail
  $ clapctl regress -n clapdb-stack --run
  $ clapctl regress -n clapdb-stack --run --subset 0,2,4
  $ clapctl regress -n clapdb-stack --run -f tests/regression.yaml
`,
  )
  .action(async (options) => {
    try {
      // Load regression list
      let regressionList: RegressCase[]
      if (options.regressionFile) {
        regressionList = await loadRegressionList(options.regressionFile)
      } else {
        regressionList = await loadDefaultRegressionList()
      }

      const verbose = regressCommand.parent?.opts().verbose ?? false

      // Show details if requested
      if (options.detail) {
        showRegressionDetail(regressionList, verbose)
        return
      }

      // Require --run flag to actually run tests
      if (!options.run) {
        regressCommand.help()
        return
      }

      const profile = regressCommand.parent?.opts().profile ?? 'default'
      const awsService = await AWSService.create(profile)

      // Load credential
      const credential = await loadClapDBCredential(options.stackName)

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

      const engine = new ClapDBEngine(credential)
      const subset = parseSubset(options.subset || '')

      let passed = 0
      let failed = 0

      for (let index = 0; index < regressionList.length; index++) {
        if (!isInSubset(index, subset)) {
          continue
        }

        const testCase = regressionList[index]

        try {
          const result = await runRegressCase(engine, testCase, index, verbose)

          if (result.passed) {
            success(`ID: ${index} Regression Pass`)
            passed++
          } else {
            error(`ID: ${index} Regression Failed`)
            console.log(`Reason: ${result.reason}`)
            if (result.expected !== undefined && result.actual !== undefined) {
              console.log(`Expect: ${result.expected}`)
              console.log(`Got   : ${result.actual}`)
            }
            failed++
          }
        } catch (err) {
          error(
            `ID: ${index} Regression Error: ${err instanceof Error ? err.message : String(err)}`,
          )
          failed++
        }
      }

      console.log('')
      console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)

      if (failed > 0) {
        process.exit(1)
      }
    } catch (err) {
      error(`Regress error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

interface RunResult {
  passed: boolean
  reason?: string
  expected?: string
  actual?: string
}

async function runRegressCase(
  engine: ClapDBEngine,
  testCase: RegressCase,
  _index: number,
  _verbose: boolean,
): Promise<RunResult> {
  // Execute SQL and get response
  const result = await engine.executeSQL(testCase.sql.trim())

  // Compare with expected
  const expectedBody = testCase.expected.body.trim()
  const actualBody = result.trim()

  if (actualBody !== expectedBody) {
    return {
      passed: false,
      reason: 'Body not match',
      expected: expectedBody,
      actual: actualBody,
    }
  }

  return { passed: true }
}

function showRegressionDetail(regressionList: RegressCase[], verbose: boolean): void {
  const table = new Table({
    head: verbose
      ? ['ID', 'Table', 'SQL', 'Status Code', 'Body']
      : ['ID', 'Table', 'SQL', 'Status Code'],
    wordWrap: true,
    colWidths: verbose ? [5, 15, 40, 12, 30] : [5, 15, 50, 12],
  })

  for (let i = 0; i < regressionList.length; i++) {
    const testCase = regressionList[i]
    const sql = testCase.sql.trim().substring(0, 100) + (testCase.sql.length > 100 ? '...' : '')

    if (verbose) {
      const body =
        testCase.expected.body.trim().substring(0, 50) +
        (testCase.expected.body.length > 50 ? '...' : '')
      table.push([String(i), testCase.table, sql, String(testCase.expected.status_code), body])
    } else {
      table.push([String(i), testCase.table, sql, String(testCase.expected.status_code)])
    }
  }

  console.log(table.toString())
}
