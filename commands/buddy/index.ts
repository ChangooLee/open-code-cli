import type { Command } from '../../commands.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Pair with a buddy agent on the current task',
  supportsNonInteractive: false,
  load: async () => ({
    call: async () => {
      throw new Error('not implemented')
    },
  }),
} satisfies Command

export default buddy
