/**
 * ClapDB MCP Module
 *
 * This module provides Model Context Protocol (MCP) support for ClapDB CLI.
 * It allows Claude Code to interact with ClapDB deployments through a
 * standardized interface.
 *
 * @example
 * ```bash
 * # Start the MCP server
 * bun run mcp
 *
 * # Install in Claude Code
 * bun run mcp:install
 * ```
 */

export { tools } from './tools'
