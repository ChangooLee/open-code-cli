import type { Command } from '../../commands.js'
import { isOpenCodeCliSubscriber } from '../../utils/auth.js'
const cost = {
  type: 'local',
  name: 'cost',
  description: 'Show the total cost and duration of the current session',
  get isHidden() {
    if (process.env.USER_TYPE === 'ant') {
      return false
    }
    return isOpenCodeCliSubscriber()
  },
  supportsNonInteractive: true,
  load: () => import('./cost.js'),
} satisfies Command
export default cost
