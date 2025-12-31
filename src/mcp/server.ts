#!/usr/bin/env bun
/**
 * ClapDB MCP Server
 *
 * This server exposes ClapDB CLI functionality to Claude Code through the
 * Model Context Protocol (MCP). It allows Claude to deploy, manage, and
 * query ClapDB instances.
 *
 * @example
 * ```bash
 * # Run directly
 * bun run src/mcp/server.ts
 *
 * # Install in Claude Code
 * claude mcp add --transport stdio clapdb -- bun run src/mcp/server.ts
 * ```
 */

// @ts-ignore - MCP SDK types may not be available
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
// @ts-ignore - MCP SDK types may not be available
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
// @ts-ignore - MCP SDK types may not be available
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { loadClapDBCredential } from '../credentials'
import { getArtifactsBucket } from '../schemas'
import { ClapDBEngine, DATASETS } from '../services/clapdb'
import { AWSCloudProvider } from '../services/cloud/aws'
import { generateRandomPassword, isPasswordValid } from '../utils'
import { tools } from './tools'

// =============================================================================
// Server Initialization
// =============================================================================

const server = new Server(
  {
    name: 'clapdb-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

/**
 * Handle tool calls from Claude
 */
server.setRequestHandler(
  CallToolRequestSchema,
  // @ts-ignore - MCP SDK types are complex, using simplified handler
  async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {
    const { name, arguments: args = {} } = request.params

    try {
      const result = await handleToolCall(name, args as Record<string, unknown>)
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      }
    }
  },
)

// =============================================================================
// Tool Implementation
// =============================================================================

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const profile = (args.profile as string) ?? 'default'
  const stackName = (args.stack_name as string) ?? 'clapdb-stack'

  switch (name) {
    // =========================================================================
    // Deployment Tools
    // =========================================================================
    case 'list_deployments': {
      const provider = await AWSCloudProvider.create(profile)
      const stacks = await provider.listStacks()

      if (args.local_only) {
        const { loadAllCredentials } = await import('../credentials')
        const credentials = await loadAllCredentials()
        return stacks.filter((s) => credentials.has(s.name))
      }

      return stacks.map((s) => ({
        name: s.name,
        status: s.status,
        created_at: s.createdAt.toISOString(),
      }))
    }

    case 'get_deployment_status': {
      const provider = await AWSCloudProvider.create(profile)
      const credential = await loadClapDBCredential(stackName)

      const [status, dataApiUrl, licenseApiUrl] = await Promise.all([
        provider.getStackStatus(stackName),
        provider.getDataApiUrl(stackName),
        provider.getLicenseApiUrl(stackName),
      ])

      return {
        stack_name: stackName,
        status,
        data_api_url: dataApiUrl,
        license_api_url: licenseApiUrl,
        tenant: credential.tenant,
        database: credential.database,
        username: credential.username,
        console_url: provider.getConsoleUrl(stackName),
      }
    }

    case 'deploy_clapdb': {
      const provider = await AWSCloudProvider.create(profile)

      // Check if stack already exists
      const exists = await provider.hasStack(stackName)
      if (exists) {
        throw new Error(`Stack '${stackName}' already exists`)
      }

      // Generate password if not provided
      let password = args.password as string | undefined
      if (!password) {
        password = generateRandomPassword(12)
      }

      if (!isPasswordValid(password)) {
        throw new Error('Password must contain lowercase, uppercase, digit, and special character')
      }

      const config = {
        stackName,
        arch: (args.arch as 'x86_64' | 'arm64') ?? 'x86_64',
        lambdaMemorySize: 3008,
        dispatcherMemorySize: 3008,
        reducerMemorySize: 3008,
        workerMemorySize: 3008,
        enablePrivateVpc: false,
        enablePrivateEndpoint: false,
        enableLogging: false,
        artifactsBucket: getArtifactsBucket(provider.region),
        updateBuiltinTemplate: false,
      }

      const stackId = await provider.deployService(stackName, config)

      // Save credentials
      const credential = await loadClapDBCredential(stackName)
      credential.tenant = (args.tenant as string) ?? 'clapdb'
      credential.database = (args.database as string) ?? 'local'
      credential.username = (args.user as string) ?? 'root'
      credential.password = password
      await credential.save()

      return {
        message: 'Deployment started',
        stack_id: stackId,
        stack_name: stackName,
        console_url: provider.getConsoleUrl(stackId),
        note: 'Deployment takes 5-10 minutes. Use get_deployment_status to check progress.',
      }
    }

    case 'delete_deployment': {
      const provider = await AWSCloudProvider.create(profile)
      const withStorage = (args.with_storage as boolean) ?? false

      const exists = await provider.hasStack(stackName)
      if (!exists) {
        throw new Error(`Stack '${stackName}' not found`)
      }

      const consoleUrl = await provider.deleteService(stackName, withStorage)

      // Delete local credentials
      const credential = await loadClapDBCredential(stackName)
      await credential.delete()

      return {
        message: 'Deletion started',
        stack_name: stackName,
        with_storage: withStorage,
        console_url: consoleUrl,
        note: 'Deletion takes a few minutes to complete.',
      }
    }

    // =========================================================================
    // SQL Tools
    // =========================================================================
    case 'execute_sql': {
      const query = args.query as string
      if (!query) {
        throw new Error('Query is required')
      }

      const credential = await loadClapDBCredential(stackName)
      if (!credential.isValid()) {
        throw new Error(`No valid credentials for stack '${stackName}'`)
      }

      const engine = new ClapDBEngine(credential)
      return await engine.executeSQL(query)
    }

    case 'show_tables': {
      const credential = await loadClapDBCredential(stackName)
      if (!credential.isValid()) {
        throw new Error(`No valid credentials for stack '${stackName}'`)
      }

      const engine = new ClapDBEngine(credential)
      return await engine.executeSQL('SHOW TABLES')
    }

    case 'describe_table': {
      const tableName = args.table_name as string
      if (!tableName) {
        throw new Error('Table name is required')
      }

      const credential = await loadClapDBCredential(stackName)
      if (!credential.isValid()) {
        throw new Error(`No valid credentials for stack '${stackName}'`)
      }

      const engine = new ClapDBEngine(credential)
      return await engine.describeTable(tableName)
    }

    // =========================================================================
    // Dataset Tools
    // =========================================================================
    case 'list_datasets': {
      return DATASETS.map((d) => ({
        name: d.name,
        table: d.table,
        format: d.format,
        rows: d.rows,
        disk_space: d.diskSpace,
      }))
    }

    case 'import_dataset': {
      const datasetName = args.dataset_name as string
      if (!datasetName) {
        throw new Error('Dataset name is required')
      }

      // Find dataset by name or table name
      const dataset = DATASETS.find((d) => d.name === datasetName || d.table === datasetName)
      if (!dataset) {
        throw new Error(
          `Dataset '${datasetName}' not found. Use list_datasets to see available datasets.`,
        )
      }

      const credential = await loadClapDBCredential(stackName)
      if (!credential.isValid()) {
        throw new Error(`No valid credentials for stack '${stackName}'`)
      }

      // Get region from AWS provider
      const provider = await AWSCloudProvider.create(profile)
      const region = provider.region

      const engine = new ClapDBEngine(credential)
      const skipCreateTable = (args.skip_create_table as boolean) ?? false

      if (!skipCreateTable) {
        await engine.createTable(dataset.table, dataset.sql)
      }

      await engine.importDataset(dataset, region)

      return {
        message: 'Dataset import started',
        dataset: dataset.name,
        table: dataset.table,
        region,
        note: 'Import runs in background. Query the table to check progress.',
      }
    }

    // =========================================================================
    // Diagnostic Tools
    // =========================================================================
    case 'run_diagnostics': {
      const results: Record<string, unknown> = {}

      // Check ClapDB credential
      try {
        const credential = await loadClapDBCredential(stackName)
        results.clapdb_credential = {
          valid: credential.isValid(),
          endpoint: credential.dataApiEndpoint,
          tenant: credential.tenant,
          database: credential.database,
        }
      } catch (error) {
        results.clapdb_credential = {
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }

      // Check AWS credential
      try {
        const provider = await AWSCloudProvider.create(profile)
        results.aws_credential = {
          valid: true,
          region: provider.region,
        }

        // Check stack exists
        const exists = await provider.hasStack(stackName)
        results.stack = {
          exists,
          name: stackName,
        }

        if (exists) {
          const status = await provider.getStackStatus(stackName)
          results.stack = { ...(results.stack as object), status }
        }
      } catch (error) {
        results.aws_credential = {
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }

      return results
    }

    case 'get_clapdb_version': {
      const credential = await loadClapDBCredential(stackName)
      if (!credential.isValid()) {
        throw new Error(`No valid credentials for stack '${stackName}'`)
      }

      const engine = new ClapDBEngine(credential)
      const version = await engine.getVersion()
      return { version }
    }

    // =========================================================================
    // User Management Tools
    // =========================================================================
    case 'add_user': {
      const username = args.username as string
      const password = args.password as string

      if (!username || !password) {
        throw new Error('Username and password are required')
      }

      if (!isPasswordValid(password)) {
        throw new Error('Password must contain lowercase, uppercase, digit, and special character')
      }

      const provider = await AWSCloudProvider.create(profile)
      await provider.addUser(stackName, {
        name: username,
        password,
        tenant: (args.tenant as string) ?? 'clapdb',
        database: (args.database as string) ?? 'local',
      })

      return {
        message: 'User added successfully',
        username,
        tenant: (args.tenant as string) ?? 'clapdb',
        database: (args.database as string) ?? 'local',
      }
    }

    // =========================================================================
    // Quota Tools
    // =========================================================================
    case 'get_lambda_quota': {
      const provider = await AWSCloudProvider.create(profile)
      const quota = await provider.getComputeQuota()
      return {
        lambda_concurrent_executions: quota,
        region: provider.region,
      }
    }

    case 'request_quota_increase': {
      const newQuota = args.new_quota as number
      if (!newQuota || newQuota <= 0) {
        throw new Error('new_quota must be a positive number')
      }

      const provider = await AWSCloudProvider.create(profile)
      const result = await provider.requestComputeQuotaIncrease(newQuota)

      return {
        message: 'Quota increase requested',
        request_id: result.requestId,
        requested_value: result.requestedValue,
        note: 'Quota increases require AWS approval and may take time.',
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// =============================================================================
// Server Startup
// =============================================================================

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[ClapDB MCP] Server started')
}

main().catch((error) => {
  console.error('[ClapDB MCP] Fatal error:', error)
  process.exit(1)
})
