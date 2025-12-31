/**
 * MCP Tool Definitions
 *
 * This module defines all tools that Claude Code can invoke through MCP.
 * Each tool maps to a clapctl CLI command.
 */

/**
 * MCP Tool interface
 */
interface Tool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Tool definitions for ClapDB MCP server
 */
export const tools: Tool[] = [
  // ==========================================================================
  // Deployment Tools
  // ==========================================================================
  {
    name: 'list_deployments',
    description:
      'List all ClapDB deployments in the AWS account. Returns deployment names, status, and creation time.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
        local_only: {
          type: 'boolean',
          description: 'Only show deployments with local credentials',
        },
      },
    },
  },
  {
    name: 'get_deployment_status',
    description:
      'Get the current status of a specific ClapDB deployment including endpoints and configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment stack',
        },
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
      required: ['stack_name'],
    },
  },
  {
    name: 'deploy_clapdb',
    description:
      'Deploy a new ClapDB instance to AWS. Creates CloudFormation stack with Lambda functions and API Gateway.',
    inputSchema: {
      type: 'object',
      properties: {
        stack_name: {
          type: 'string',
          description: 'Name for the deployment stack',
        },
        arch: {
          type: 'string',
          enum: ['x86_64', 'arm64'],
          description: 'CPU architecture (default: x86_64)',
        },
        user: {
          type: 'string',
          description: 'Database username (default: root)',
        },
        password: {
          type: 'string',
          description: 'Database password (auto-generated if not provided)',
        },
        tenant: {
          type: 'string',
          description: 'Tenant name (default: clapdb)',
        },
        database: {
          type: 'string',
          description: 'Database name (default: local)',
        },
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
      required: ['stack_name'],
    },
  },
  {
    name: 'delete_deployment',
    description:
      'Delete a ClapDB deployment. Removes CloudFormation stack and optionally the S3 storage bucket.',
    inputSchema: {
      type: 'object',
      properties: {
        stack_name: {
          type: 'string',
          description: 'Name of the deployment stack to delete',
        },
        with_storage: {
          type: 'boolean',
          description: 'Also delete the S3 storage bucket (default: false)',
        },
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
      required: ['stack_name'],
    },
  },

  // ==========================================================================
  // SQL Tools
  // ==========================================================================
  {
    name: 'execute_sql',
    description: 'Execute a SQL query against a ClapDB deployment. Returns query results as JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query to execute',
        },
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'show_tables',
    description: 'List all tables in the ClapDB deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
      },
    },
  },
  {
    name: 'describe_table',
    description: 'Get the schema/structure of a specific table.',
    inputSchema: {
      type: 'object',
      properties: {
        table_name: {
          type: 'string',
          description: 'Name of the table to describe',
        },
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
      },
      required: ['table_name'],
    },
  },

  // ==========================================================================
  // Dataset Tools
  // ==========================================================================
  {
    name: 'list_datasets',
    description: 'List available built-in datasets that can be imported into ClapDB.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'import_dataset',
    description: 'Import a built-in dataset into ClapDB. Creates table and loads data.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset_name: {
          type: 'string',
          description: 'Name of the dataset to import (e.g., hdfs_logs, hits)',
        },
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
        skip_create_table: {
          type: 'boolean',
          description: 'Skip table creation if it already exists',
        },
      },
      required: ['dataset_name'],
    },
  },

  // ==========================================================================
  // Diagnostic Tools
  // ==========================================================================
  {
    name: 'run_diagnostics',
    description:
      'Run diagnostic checks on ClapDB deployment including credentials, AWS config, and license status.',
    inputSchema: {
      type: 'object',
      properties: {
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
    },
  },
  {
    name: 'get_clapdb_version',
    description: 'Get the ClapDB engine version for a deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
      },
    },
  },

  // ==========================================================================
  // User Management Tools
  // ==========================================================================
  {
    name: 'add_user',
    description: 'Add a new user to a ClapDB deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username for the new user',
        },
        password: {
          type: 'string',
          description: 'Password for the new user',
        },
        tenant: {
          type: 'string',
          description: 'Tenant name (default: clapdb)',
        },
        database: {
          type: 'string',
          description: 'Database name (default: local)',
        },
        stack_name: {
          type: 'string',
          description: 'Name of the ClapDB deployment (default: clapdb-stack)',
        },
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
      required: ['username', 'password'],
    },
  },

  // ==========================================================================
  // Quota Tools
  // ==========================================================================
  {
    name: 'get_lambda_quota',
    description: 'Get the current Lambda concurrent execution quota for the AWS account.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
    },
  },
  {
    name: 'request_quota_increase',
    description: 'Request an increase to the Lambda concurrent execution quota.',
    inputSchema: {
      type: 'object',
      properties: {
        new_quota: {
          type: 'number',
          description: 'Requested new quota value',
        },
        profile: {
          type: 'string',
          description: 'AWS profile name (default: "default")',
        },
      },
      required: ['new_quota'],
    },
  },
]
