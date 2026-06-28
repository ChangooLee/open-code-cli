import type { Command } from '../../commands.js'

const fork = {
  type: 'local',
  name: 'fork',
  description: 'Fork the current conversation into a sub-agent',
  supportsNonInteractive: false,
  load: async () => ({
    call: async () => {
      throw new Error('not implemented')
    },
  }),
} satisfies Command

export default fork
