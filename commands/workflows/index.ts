import type { Command } from '../../commands.js'

const workflows = {
  type: 'local',
  name: 'workflows',
  description: 'Manage and run saved workflow scripts',
  supportsNonInteractive: false,
  load: async () => ({
    call: async () => {
      throw new Error('not implemented')
    },
  }),
} satisfies Command

export default workflows
