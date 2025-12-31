import { Command } from 'commander'
import {
  authCommand,
  bugCommand,
  configureCommand,
  datasetCommand,
  deleteCommand,
  deployCommand,
  doctorCommand,
  infoCommand,
  licenseCommand,
  quotaCommand,
  regressCommand,
  sqlCommand,
  statusCommand,
  updateCommand,
  userCommand,
} from './commands'

// Version injected at build time via --define
declare const __APP_VERSION__: string
const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev'

export const program = new Command()

program
  .name('clapctl')
  .description('ClapDB CLI - Manage ClapDB deployments on AWS')
  .version(version)
  .option('-p, --profile <profile>', 'AWS profile to use', 'default')
  .option('-v, --verbose', 'Enable verbose output')

// Register all commands
program.addCommand(configureCommand)
program.addCommand(deployCommand)
program.addCommand(statusCommand)
program.addCommand(deleteCommand)
program.addCommand(updateCommand)
program.addCommand(sqlCommand)
program.addCommand(userCommand)
program.addCommand(datasetCommand)
program.addCommand(infoCommand)
program.addCommand(doctorCommand)
program.addCommand(licenseCommand)
program.addCommand(quotaCommand)
program.addCommand(regressCommand)
program.addCommand(bugCommand)
program.addCommand(authCommand)
