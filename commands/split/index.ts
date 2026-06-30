import type { Command } from '../../commands.js'

const split = {
  type: 'local',
  name: 'split',
  description: 'Split the current conversation into a sub-agent',
  supportsNonInteractive: false,
  load: async () => ({
    call: async () => {
      throw new Error('not implemented')
    },
  }),
} satisfies Command

export default split
