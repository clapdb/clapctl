import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export const successIcon = chalk.green('✓')
export const errorIcon = chalk.red('✗')
export const warningIcon = chalk.yellow('!')
export const infoIcon = chalk.blue('i')

export const colorScheme = {
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  gray: chalk.gray,
  bold: chalk.bold,
}

export function success(message: string): void {
  console.log(`${successIcon} ${colorScheme.green(message)}`)
}

export function error(message: string): void {
  console.error(`${errorIcon} ${colorScheme.red(message)}`)
}

export function warning(message: string): void {
  console.log(`${warningIcon} ${colorScheme.yellow(message)}`)
}

export function info(message: string): void {
  console.log(`${infoIcon} ${colorScheme.blue(message)}`)
}

export function spinner(text: string): Ora {
  return ora({
    text,
    color: 'yellow',
  })
}

export function mask(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length)
  }
  return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2)
}
