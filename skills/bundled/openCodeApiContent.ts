import csharpOpenCodeApi from './openai-compatible-api/csharp/openai-compatible-api.md'
import curlExamples from './openai-compatible-api/curl/examples.md'
import goOpenCodeApi from './openai-compatible-api/go/openai-compatible-api.md'
import javaOpenCodeApi from './openai-compatible-api/java/openai-compatible-api.md'
import phpOpenCodeApi from './openai-compatible-api/php/openai-compatible-api.md'
import pythonAgentSdkPatterns from './openai-compatible-api/python/open-code-cli-sdk/patterns.md'
import pythonAgentSdkReadme from './openai-compatible-api/python/open-code-cli-sdk/README.md'
import pythonOpenCodeApiBatches from './openai-compatible-api/python/openai-compatible-api/batches.md'
import pythonOpenCodeApiFilesApi from './openai-compatible-api/python/openai-compatible-api/files-api.md'
import pythonOpenCodeApiReadme from './openai-compatible-api/python/openai-compatible-api/README.md'
import pythonOpenCodeApiStreaming from './openai-compatible-api/python/openai-compatible-api/streaming.md'
import pythonOpenCodeApiToolUse from './openai-compatible-api/python/openai-compatible-api/tool-use.md'
import rubyOpenCodeApi from './openai-compatible-api/ruby/openai-compatible-api.md'
import skillPrompt from './openai-compatible-api/SKILL.md'
import sharedErrorCodes from './openai-compatible-api/shared/error-codes.md'
import sharedLiveSources from './openai-compatible-api/shared/live-sources.md'
import sharedModels from './openai-compatible-api/shared/models.md'
import sharedPromptCaching from './openai-compatible-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './openai-compatible-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './openai-compatible-api/typescript/open-code-cli-sdk/patterns.md'
import typescriptAgentSdkReadme from './openai-compatible-api/typescript/open-code-cli-sdk/README.md'
import typescriptOpenCodeApiBatches from './openai-compatible-api/typescript/openai-compatible-api/batches.md'
import typescriptOpenCodeApiFilesApi from './openai-compatible-api/typescript/openai-compatible-api/files-api.md'
import typescriptOpenCodeApiReadme from './openai-compatible-api/typescript/openai-compatible-api/README.md'
import typescriptOpenCodeApiStreaming from './openai-compatible-api/typescript/openai-compatible-api/streaming.md'
import typescriptOpenCodeApiToolUse from './openai-compatible-api/typescript/openai-compatible-api/tool-use.md'
export const SKILL_MODEL_VARS = {
  PRO_ID: 'openai/gpt-4.1',
  PRO_NAME: 'configured model 4.6',
  STANDARD_ID: 'openai/gpt-4o',
  STANDARD_NAME: 'Open Code CLI GPT-4o',
  FAST_ID: 'openai/gpt-4o-mini',
  FAST_NAME: 'Open Code CLI GPT-4o mini',
  PREV_STANDARD_ID: 'openai/gpt-4o',
} satisfies Record<string, string>
export const SKILL_PROMPT: string = skillPrompt
export const SKILL_FILES: Record<string, string> = {
  'csharp/openai-compatible-api.md': csharpOpenCodeApi,
  'curl/examples.md': curlExamples,
  'go/openai-compatible-api.md': goOpenCodeApi,
  'java/openai-compatible-api.md': javaOpenCodeApi,
  'php/openai-compatible-api.md': phpOpenCodeApi,
  'python/open-code-cli-sdk/README.md': pythonAgentSdkReadme,
  'python/open-code-cli-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/openai-compatible-api/README.md': pythonOpenCodeApiReadme,
  'python/openai-compatible-api/batches.md': pythonOpenCodeApiBatches,
  'python/openai-compatible-api/files-api.md': pythonOpenCodeApiFilesApi,
  'python/openai-compatible-api/streaming.md': pythonOpenCodeApiStreaming,
  'python/openai-compatible-api/tool-use.md': pythonOpenCodeApiToolUse,
  'ruby/openai-compatible-api.md': rubyOpenCodeApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/open-code-cli-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/open-code-cli-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/openai-compatible-api/README.md': typescriptOpenCodeApiReadme,
  'typescript/openai-compatible-api/batches.md': typescriptOpenCodeApiBatches,
  'typescript/openai-compatible-api/files-api.md': typescriptOpenCodeApiFilesApi,
  'typescript/openai-compatible-api/streaming.md': typescriptOpenCodeApiStreaming,
  'typescript/openai-compatible-api/tool-use.md': typescriptOpenCodeApiToolUse,
}
