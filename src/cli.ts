import { Command } from 'commander'
import {
  configureCommand,
  deployCommand,
  statusCommand,
  deleteCommand,
  updateCommand,
  sqlCommand,
  userCommand,
  datasetCommand,
  infoCommand,
  doctorCommand,
  licenseCommand,
  quotaCommand,
  regressCommand,
  bugCommand,
} from './commands'

export const program = new Command()

program
  .name('clapctl')
  .description('ClapDB CLI - Manage ClapDB deployments on AWS')
  .version('0.1.0')
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
