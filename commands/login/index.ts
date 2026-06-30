import type { Command } from '../../commands.js'
import { hasProviderApiKeyAuth } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    description: hasProviderApiKeyAuth()
      ? 'Switch Open Code CLI accounts'
      : 'Sign in with your Open Code CLI account',
    isEnabled: () => !isEnvTruthy(process.env.DISABLE_LOGIN_COMMAND),
    load: () => import('./login.js'),
  }) satisfies Command
