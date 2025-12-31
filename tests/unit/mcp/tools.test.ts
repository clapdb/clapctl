import { describe, expect, test } from 'bun:test'
import { tools } from '../../../src/mcp/tools'

describe('MCP Tools', () => {
  describe('tool definitions', () => {
    test('should export an array of tools', () => {
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBeGreaterThan(0)
    })

    test('each tool should have required properties', () => {
      for (const tool of tools) {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.inputSchema).toBe('object')
      }
    })

    test('each tool should have valid inputSchema', () => {
      for (const tool of tools) {
        expect(tool.inputSchema).toHaveProperty('type')
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema).toHaveProperty('properties')
        expect(typeof tool.inputSchema.properties).toBe('object')
      }
    })

    test('tool names should be unique', () => {
      const names = tools.map((t) => t.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    test('tool names should be snake_case', () => {
      for (const tool of tools) {
        expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/)
      }
    })
  })

  describe('deployment tools', () => {
    test('should have list_deployments tool', () => {
      const tool = tools.find((t) => t.name === 'list_deployments')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('List')
      expect(tool?.inputSchema.properties).toHaveProperty('profile')
    })

    test('should have get_deployment_status tool', () => {
      const tool = tools.find((t) => t.name === 'get_deployment_status')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('stack_name')
    })

    test('should have deploy_clapdb tool', () => {
      const tool = tools.find((t) => t.name === 'deploy_clapdb')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.properties).toHaveProperty('stack_name')
      expect(tool?.inputSchema.properties).toHaveProperty('arch')
      expect(tool?.inputSchema.required).toContain('stack_name')
    })

    test('should have delete_deployment tool', () => {
      const tool = tools.find((t) => t.name === 'delete_deployment')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.properties).toHaveProperty('with_storage')
      expect(tool?.inputSchema.required).toContain('stack_name')
    })
  })

  describe('SQL tools', () => {
    test('should have execute_sql tool', () => {
      const tool = tools.find((t) => t.name === 'execute_sql')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('query')
    })

    test('should have show_tables tool', () => {
      const tool = tools.find((t) => t.name === 'show_tables')
      expect(tool).toBeDefined()
    })

    test('should have describe_table tool', () => {
      const tool = tools.find((t) => t.name === 'describe_table')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('table_name')
    })
  })

  describe('dataset tools', () => {
    test('should have list_datasets tool', () => {
      const tool = tools.find((t) => t.name === 'list_datasets')
      expect(tool).toBeDefined()
    })

    test('should have import_dataset tool', () => {
      const tool = tools.find((t) => t.name === 'import_dataset')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('dataset_name')
    })
  })

  describe('diagnostic tools', () => {
    test('should have run_diagnostics tool', () => {
      const tool = tools.find((t) => t.name === 'run_diagnostics')
      expect(tool).toBeDefined()
    })

    test('should have get_clapdb_version tool', () => {
      const tool = tools.find((t) => t.name === 'get_clapdb_version')
      expect(tool).toBeDefined()
    })
  })

  describe('user management tools', () => {
    test('should have add_user tool', () => {
      const tool = tools.find((t) => t.name === 'add_user')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('username')
      expect(tool?.inputSchema.required).toContain('password')
    })
  })

  describe('quota tools', () => {
    test('should have get_lambda_quota tool', () => {
      const tool = tools.find((t) => t.name === 'get_lambda_quota')
      expect(tool).toBeDefined()
    })

    test('should have request_quota_increase tool', () => {
      const tool = tools.find((t) => t.name === 'request_quota_increase')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('new_quota')
    })
  })

  describe('tool count', () => {
    test('should have expected number of tools', () => {
      // Deployment: 4, SQL: 3, Dataset: 2, Diagnostic: 2, User: 1, Quota: 2
      expect(tools.length).toBe(14)
    })
  })
})
