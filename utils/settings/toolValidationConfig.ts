export type ToolValidationConfig = {
  filePatternTools: string[]
  bashPrefixTools: string[]
  customValidation: {
    [toolName: string]: (content: string) => {
      valid: boolean
      error?: string
      suggestion?: string
      examples?: string[]
    }
  }
}
export const TOOL_VALIDATION_CONFIG: ToolValidationConfig = {
  filePatternTools: [
    'Read',
    'Write',
    'Edit',
    'Glob',
    'NotebookRead',
    'NotebookEdit',
  ],
  bashPrefixTools: ['Bash'],
  customValidation: {
    WebSearch: content => {
      if (content.includes('*') || content.includes('?')) {
        return {
          valid: false,
          error: 'WebSearch does not support wildcards',
          suggestion: 'Use exact search terms without * or ?',
          examples: ['WebSearch(open-code-cli ai)', 'WebSearch(typescript tutorial)'],
        }
      }
      return { valid: true }
    },
    WebFetch: content => {
      if (content.includes('://') || content.startsWith('http')) {
        return {
          valid: false,
          error: 'WebFetch permissions use domain format, not URLs',
          suggestion: 'Use "domain:hostname" format',
          examples: [
            'WebFetch(domain:example.com)',
            'WebFetch(domain:github.com)',
          ],
        }
      }
      if (!content.startsWith('domain:')) {
        return {
          valid: false,
          error: 'WebFetch permissions must use "domain:" prefix',
          suggestion: 'Use "domain:hostname" format',
          examples: [
            'WebFetch(domain:example.com)',
            'WebFetch(domain:*.google.com)',
          ],
        }
      }
      return { valid: true }
    },
  },
}
export function isFilePatternTool(toolName: string): boolean {
  return TOOL_VALIDATION_CONFIG.filePatternTools.includes(toolName)
}
export function isBashPrefixTool(toolName: string): boolean {
  return TOOL_VALIDATION_CONFIG.bashPrefixTools.includes(toolName)
}
export function getCustomValidation(toolName: string) {
  return TOOL_VALIDATION_CONFIG.customValidation[toolName]
}
