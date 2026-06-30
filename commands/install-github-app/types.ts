export type Workflow = 'open-code-cli' | 'open-code-cli-review'

export type Warning = {
  title: string
  message: string
  instructions: string[]
}

export type State = {
  step:
    | 'check-gh'
    | 'warnings'
    | 'choose-repo'
    | 'install-app'
    | 'check-existing-workflow'
    | 'select-workflows'
    | 'check-existing-secret'
    | 'api-key'
    | 'oauth-flow'
    | 'creating'
    | 'success'
    | 'error'
  selectedRepoName: string
  currentRepo: string
  useCurrentRepo: boolean
  apiKeyOrOAuthToken: string
  useExistingKey: boolean
  currentWorkflowInstallStep: number
  warnings: Warning[]
  secretExists: boolean
  secretName: string
  useExistingSecret: boolean
  workflowExists: boolean
  selectedWorkflows: Workflow[]
  selectedApiKeyOption: 'existing' | 'new' | 'oauth'
  authType: 'api_key' | 'oauth_token'
  workflowAction?: 'update' | 'skip' | 'exit'
  error?: string
  errorReason?: string
  errorInstructions?: string[]
}
