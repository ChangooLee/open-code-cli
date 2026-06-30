import type { Command } from '../../commands.js'

const backtrack = {
  description: `Restore the code and/or conversation to a previous point`,
  name: 'backtrack',
  aliases: ['checkpoint'],
  argumentHint: '',
  type: 'local',
  supportsNonInteractive: false,
  load: () => import('./backtrack.js'),
} satisfies Command

export default backtrack
