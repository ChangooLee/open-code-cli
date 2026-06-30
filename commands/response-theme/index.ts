import type { Command } from '../../commands.js'

const responseTheme = {
  type: 'local-jsx',
  name: 'response-theme',
  description: 'Deprecated: use /config to change output style',
  isHidden: true,
  load: () => import('./response-theme.js'),
} satisfies Command

export default responseTheme
