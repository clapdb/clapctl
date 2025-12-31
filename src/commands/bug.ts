import { Command } from 'commander'
import open from 'open'

const GITHUB_ISSUES_URL = 'https://github.com/clapdb/clapdb/issues/new'

export const bugCommand = new Command('bug')
  .description('Report a bug')
  .addHelpText(
    'after',
    `
Examples:
  $ clapctl bug
`,
  )
  .action(async () => {
    console.log('Opening GitHub issues page...')
    console.log(`URL: ${GITHUB_ISSUES_URL}`)

    try {
      await open(GITHUB_ISSUES_URL)
    } catch {
      console.log('Could not open browser automatically.')
      console.log('Please visit the URL above to report a bug.')
    }
  })
