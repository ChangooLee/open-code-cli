import type { Command } from '../../commands.js'

const peers = {
  type: 'local',
  name: 'peers',
  description: 'View and manage peer agent connections',
  supportsNonInteractive: false,
  load: async () => ({
    call: async () => {
      throw new Error('not implemented')
    },
  }),
} satisfies Command

export default peers
