import { Box, Text } from '../ink.js';
import * as React from 'react';
import { getLargeMemoryFiles, MAX_MEMORY_CHARACTER_COUNT, type MemoryFileInfo } from './openCodeMd.js';
import figures from 'figures';
import { getCwd } from './cwd.js';
import { relative } from 'path';
import { formatNumber } from './format.js';
import type { getGlobalConfig } from './config.js';
import { getOpenAICompatibleApiKeyWithSource, getApiKeyFromConfigOrMacOSKeychain, getAuthTokenSource, isOpenCodeCliSubscriber } from './auth.js';
import type { AgentDefinitionsResult } from '../tools/AgentTool/loadAgentsDir.js';
import { getAgentDescriptionsTotalTokens, AGENT_DESCRIPTIONS_THRESHOLD } from './statusNoticeHelpers.js';
import { isSupportedJetBrainsTerminal, toIDEDisplayName, getTerminalIdeType } from './ide.js';
import { isJetBrainsPluginInstalledCachedSync } from './jetbrains.js';
export type StatusNoticeType = 'warning' | 'info';
export type StatusNoticeContext = {
  config: ReturnType<typeof getGlobalConfig>;
  agentDefinitions?: AgentDefinitionsResult;
  memoryFiles: MemoryFileInfo[];
};
export type StatusNoticeDefinition = {
  id: string;
  type: StatusNoticeType;
  isActive: (context: StatusNoticeContext) => boolean;
  render: (context: StatusNoticeContext) => React.ReactNode;
};
const largeMemoryFilesNotice: StatusNoticeDefinition = {
  id: 'large-memory-files',
  type: 'warning',
  isActive: ctx => getLargeMemoryFiles(ctx.memoryFiles).length > 0,
  render: ctx => {
    const largeMemoryFiles = getLargeMemoryFiles(ctx.memoryFiles);
    return <>
        {largeMemoryFiles.map(file => {
        const displayPath = file.path.startsWith(getCwd()) ? relative(getCwd(), file.path) : file.path;
        return <Box key={file.path} flexDirection="row">
              <Text color="warning">{figures.warning}</Text>
              <Text color="warning">
                Large <Text bold>{displayPath}</Text> will impact performance (
                {formatNumber(file.content.length)} chars &gt;{' '}
                {formatNumber(MAX_MEMORY_CHARACTER_COUNT)})
                <Text dimColor> · /memory to edit</Text>
              </Text>
            </Box>;
      })}
      </>;
  }
};
const openCodeCliSubscriberExternalTokenNotice: StatusNoticeDefinition = {
  id: 'open-code-cli-ai-external-token',
  type: 'warning',
  isActive: () => {
    const authTokenInfo = getAuthTokenSource();
    return isOpenCodeCliSubscriber() && (authTokenInfo.source === 'OPEN_CODE_CLI_AUTH_TOKEN' || authTokenInfo.source === 'apiKeyHelper');
  },
  render: () => {
    const authTokenInfo = getAuthTokenSource();
    return <Box flexDirection="row" marginTop={1}>
        <Text color="warning">{figures.warning}</Text>
        <Text color="warning">
          Auth conflict: Using {authTokenInfo.source} instead of Open Code CLI account
          subscription token. Either unset {authTokenInfo.source}, or run
          `open-code-cli /logout`.
        </Text>
      </Box>;
  }
};
const apiKeyConflictNotice: StatusNoticeDefinition = {
  id: 'api-key-conflict',
  type: 'warning',
  isActive: () => {
    const {
      source: apiKeySource
    } = getOpenAICompatibleApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true
    });
    return !!getApiKeyFromConfigOrMacOSKeychain() && (apiKeySource === 'OPEN_CODE_CLI_API_KEY' || apiKeySource === 'apiKeyHelper');
  },
  render: () => {
    const {
      source: apiKeySource
    } = getOpenAICompatibleApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true
    });
    return <Box flexDirection="row" marginTop={1}>
        <Text color="warning">{figures.warning}</Text>
        <Text color="warning">
          Auth conflict: Using {apiKeySource} instead of OpenAICompatible Console key.
          Either unset {apiKeySource}, or run `open-code-cli /logout`.
        </Text>
      </Box>;
  }
};
const bothAuthMethodsNotice: StatusNoticeDefinition = {
  id: 'both-auth-methods',
  type: 'warning',
  isActive: () => {
    const {
      source: apiKeySource
    } = getOpenAICompatibleApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true
    });
    const authTokenInfo = getAuthTokenSource();
    return apiKeySource !== 'none' && authTokenInfo.source !== 'none' && !(apiKeySource === 'apiKeyHelper' && authTokenInfo.source === 'apiKeyHelper');
  },
  render: () => {
    const {
      source: apiKeySource
    } = getOpenAICompatibleApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true
    });
    const authTokenInfo = getAuthTokenSource();
    return <Box flexDirection="column" marginTop={1}>
        <Box flexDirection="row">
          <Text color="warning">{figures.warning}</Text>
          <Text color="warning">
            Auth conflict: Both a token ({authTokenInfo.source}) and an API key
            ({apiKeySource}) are set. This may lead to unexpected behavior.
          </Text>
        </Box>
        <Box flexDirection="column" marginLeft={3}>
          <Text color="warning">
            · Trying to use{' '}
            {authTokenInfo.source === 'Open Code CLI' ? 'Open Code CLI' : authTokenInfo.source}
            ?{' '}
            {apiKeySource === 'OPEN_CODE_CLI_API_KEY' ? 'Unset the OPEN_CODE_CLI_API_KEY environment variable, or open-code-cli /logout then say "No" to the API key approval before login.' : apiKeySource === 'apiKeyHelper' ? 'Unset the apiKeyHelper setting.' : 'open-code-cli /logout'}
          </Text>
          <Text color="warning">
            · Trying to use {apiKeySource}?{' '}
            {authTokenInfo.source === 'Open Code CLI' ? 'open-code-cli /logout to sign out of Open Code CLI.' : `Unset the ${authTokenInfo.source} environment variable.`}
          </Text>
        </Box>
      </Box>;
  }
};
const largeAgentDescriptionsNotice: StatusNoticeDefinition = {
  id: 'large-agent-descriptions',
  type: 'warning',
  isActive: context => {
    const totalTokens = getAgentDescriptionsTotalTokens(context.agentDefinitions);
    return totalTokens > AGENT_DESCRIPTIONS_THRESHOLD;
  },
  render: context => {
    const totalTokens = getAgentDescriptionsTotalTokens(context.agentDefinitions);
    return <Box flexDirection="row">
        <Text color="warning">{figures.warning}</Text>
        <Text color="warning">
          Large cumulative agent descriptions will impact performance (~
          {formatNumber(totalTokens)} tokens &gt;{' '}
          {formatNumber(AGENT_DESCRIPTIONS_THRESHOLD)})
          <Text dimColor> · /agents to manage</Text>
        </Text>
      </Box>;
  }
};
const jetbrainsPluginNotice: StatusNoticeDefinition = {
  id: 'jetbrains-plugin-install',
  type: 'info',
  isActive: context => {
    if (!isSupportedJetBrainsTerminal()) {
      return false;
    }
    const shouldAutoInstall = context.config.autoInstallIdeExtension ?? true;
    if (!shouldAutoInstall) {
      return false;
    }
    const ideType = getTerminalIdeType();
    return ideType !== null && !isJetBrainsPluginInstalledCachedSync(ideType);
  },
  render: () => {
    const ideType = getTerminalIdeType();
    const ideName = toIDEDisplayName(ideType);
    return <Box flexDirection="row" gap={1} marginLeft={1}>
        <Text color="ide">{figures.arrowUp}</Text>
        <Text>
          Install the <Text color="ide">{ideName}</Text> plugin from the
          JetBrains Marketplace:{' '}
          <Text bold>https://docs.open-code-cli.com/s/open-code-cli-jetbrains</Text>
        </Text>
      </Box>;
  }
};
export const statusNoticeDefinitions: StatusNoticeDefinition[] = [largeMemoryFilesNotice, largeAgentDescriptionsNotice, openCodeCliSubscriberExternalTokenNotice, apiKeyConflictNotice, bothAuthMethodsNotice, jetbrainsPluginNotice];
export function getActiveNotices(context: StatusNoticeContext): StatusNoticeDefinition[] {
  return statusNoticeDefinitions.filter(notice => notice.isActive(context));
}
