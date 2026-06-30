import figures from 'figures';
import React, { useEffect, useRef, useState } from 'react';
import { type AnalyticsScalarMetadata, logEvent } from 'src/services/analytics/index.js';
import type { CommandResultDisplay } from '../../commands.js';
import { getOauthConfig } from '../../constants/oauth.js';
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { setClipboard } from '../../ink/termio/osc.js';
import { Box, color, Link, Text, useInput, useTheme } from '../../ink.js';
import { useKeybinding } from '../../keybindings/useKeybinding.js';
import { AuthenticationCancelledError, performMCPOAuthFlow, revokeServerTokens } from '../../services/mcp/auth.js';
import { clearServerCache } from '../../services/mcp/client.js';
import { useMcpReconnect, useMcpToggleEnabled } from '../../services/mcp/MCPConnectionManager.js';
import { describeMcpConfigFilePath, excludeCommandsByServer, excludeResourcesByServer, excludeToolsByServer, filterMcpPromptsByServer } from '../../services/mcp/utils.js';
import { useAppState, useSetAppState } from '../../state/AppState.js';
import { getOauthAccountInfo } from '../../utils/auth.js';
import { openBrowser } from '../../utils/browser.js';
import { getOpenCodeCliEnv } from '../../utils/envUtils.js';
import { errorMessage } from '../../utils/errors.js';
import { logMCPDebug } from '../../utils/log.js';
import { capitalize } from '../../utils/stringUtils.js';
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js';
import { Select } from '../CustomSelect/index.js';
import { Byline } from '../design-system/Byline.js';
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js';
import { Spinner } from '../Spinner.js';
import TextInput from '../TextInput.js';
import { CapabilitiesSection } from './CapabilitiesSection.js';
import type { OpenCodeCliServerInfo, HTTPServerInfo, SSEServerInfo } from './types.js';
import { handleReconnectError, handleReconnectResult } from './utils/reconnectHelpers.js';
type Props = {
  server: SSEServerInfo | HTTPServerInfo | OpenCodeCliServerInfo;
  serverToolsCount: number;
  onViewTools: () => void;
  onCancel: () => void;
  onComplete?: (result?: string, options?: {
    display?: CommandResultDisplay;
  }) => void;
  borderless?: boolean;
};
export function MCPRemoteServerMenu({
  server,
  serverToolsCount,
  onViewTools,
  onCancel,
  onComplete,
  borderless = false
}: Props): React.ReactNode {
  const [theme] = useTheme();
  const exitState = useExitOnCtrlCDWithKeybindings();
  const {
    columns: terminalColumns
  } = useTerminalSize();
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mcp = useAppState(s => s.mcp);
  const setAppState = useSetAppState();
  const [authorizationUrl, setAuthorizationUrl] = React.useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const authAbortControllerRef = useRef<AbortController | null>(null);
  const [isOpenCodeCliAuthenticating, setIsOpenCodeCliAuthenticating] = useState(false);
  const [openCodeCliAIAuthUrl, setOpenCodeCliAuthUrl] = useState<string | null>(null);
  const [isOpenCodeCliClearingAuth, setIsOpenCodeCliClearingAuth] = useState(false);
  const [openCodeCliAIClearAuthUrl, setOpenCodeCliClearAuthUrl] = useState<string | null>(null);
  const [openCodeCliAIClearAuthBrowserOpened, setOpenCodeCliClearAuthBrowserOpened] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unmountedRef = useRef(false);
  const [callbackUrlInput, setCallbackUrlInput] = useState('');
  const [callbackUrlCursorOffset, setCallbackUrlCursorOffset] = useState(0);
  const [manualCallbackSubmit, setManualCallbackSubmit] = useState<((url: string) => void) | null>(null);
  useEffect(() => () => {
    unmountedRef.current = true;
    authAbortControllerRef.current?.abort();
    if (copyTimeoutRef.current !== undefined) {
      clearTimeout(copyTimeoutRef.current);
    }
  }, []);
  const isEffectivelyAuthenticated = server.isAuthenticated || server.client.type === 'connected' && serverToolsCount > 0;
  const reconnectMcpServer = useMcpReconnect();
  const handleOpenCodeCliAuthComplete = React.useCallback(async () => {
    setIsOpenCodeCliAuthenticating(false);
    setOpenCodeCliAuthUrl(null);
    setIsReconnecting(true);
    try {
      const result = await reconnectMcpServer(server.name);
      const success = result.client.type === 'connected';
      logEvent('open_code_cli_openCodeCli_mcp_auth_completed', {
        success
      });
      if (success) {
        onComplete?.(`Authentication successful. Connected to ${server.name}.`);
      } else if (result.client.type === 'needs-auth') {
        onComplete?.('Authentication successful, but server still requires authentication. You may need to manually restart Open Code CLI.');
      } else {
        onComplete?.('Authentication successful, but server reconnection failed. You may need to manually restart Open Code CLI for the changes to take effect.');
      }
    } catch (err) {
      logEvent('open_code_cli_openCodeCli_mcp_auth_completed', {
        success: false
      });
      onComplete?.(handleReconnectError(err, server.name));
    } finally {
      setIsReconnecting(false);
    }
  }, [reconnectMcpServer, server.name, onComplete]);
  const handleOpenCodeCliClearAuthComplete = React.useCallback(async () => {
    await clearServerCache(server.name, {
      ...server.config,
      scope: server.scope
    });
    setAppState(prev => {
      const newClients = prev.mcp.clients.map(c => c.name === server.name ? {
        ...c,
        type: 'needs-auth' as const
      } : c);
      const newTools = excludeToolsByServer(prev.mcp.tools, server.name);
      const newCommands = excludeCommandsByServer(prev.mcp.commands, server.name);
      const newResources = excludeResourcesByServer(prev.mcp.resources, server.name);
      return {
        ...prev,
        mcp: {
          ...prev.mcp,
          clients: newClients,
          tools: newTools,
          commands: newCommands,
          resources: newResources
        }
      };
    });
    logEvent('open_code_cli_openCodeCli_mcp_clear_auth_completed', {});
    onComplete?.(`Disconnected from ${server.name}.`);
    setIsOpenCodeCliClearingAuth(false);
    setOpenCodeCliClearAuthUrl(null);
    setOpenCodeCliClearAuthBrowserOpened(false);
  }, [server.name, server.config, server.scope, setAppState, onComplete]);
  useKeybinding('confirm:no', () => {
    authAbortControllerRef.current?.abort();
    authAbortControllerRef.current = null;
    setIsAuthenticating(false);
    setAuthorizationUrl(null);
  }, {
    context: 'Confirmation',
    isActive: isAuthenticating
  });
  useKeybinding('confirm:no', () => {
    setIsOpenCodeCliAuthenticating(false);
    setOpenCodeCliAuthUrl(null);
  }, {
    context: 'Confirmation',
    isActive: isOpenCodeCliAuthenticating
  });
  useKeybinding('confirm:no', () => {
    setIsOpenCodeCliClearingAuth(false);
    setOpenCodeCliClearAuthUrl(null);
    setOpenCodeCliClearAuthBrowserOpened(false);
  }, {
    context: 'Confirmation',
    isActive: isOpenCodeCliClearingAuth
  });
  useInput((input, key) => {
    if (key.return && isOpenCodeCliAuthenticating) {
      void handleOpenCodeCliAuthComplete();
    }
    if (key.return && isOpenCodeCliClearingAuth) {
      if (openCodeCliAIClearAuthBrowserOpened) {
        void handleOpenCodeCliClearAuthComplete();
      } else {
        const connectorsUrl = `${getOauthConfig().OPEN_CODE_CLI_ORIGIN}/settings/connectors`;
        setOpenCodeCliClearAuthUrl(connectorsUrl);
        setOpenCodeCliClearAuthBrowserOpened(true);
        void openBrowser(connectorsUrl);
      }
    }
    if (input === 'c' && !urlCopied) {
      const urlToCopy = authorizationUrl || openCodeCliAIAuthUrl || openCodeCliAIClearAuthUrl;
      if (urlToCopy) {
        void setClipboard(urlToCopy).then(raw => {
          if (unmountedRef.current) return;
          if (raw) process.stdout.write(raw);
          setUrlCopied(true);
          if (copyTimeoutRef.current !== undefined) {
            clearTimeout(copyTimeoutRef.current);
          }
          copyTimeoutRef.current = setTimeout(setUrlCopied, 2000, false);
        });
      }
    }
  });
  const capitalizedServerName = capitalize(String(server.name));
  const serverCommandsCount = filterMcpPromptsByServer(mcp.commands, server.name).length;
  const toggleMcpServer = useMcpToggleEnabled();
  const handleOpenCodeCliAuth = React.useCallback(async () => {
    const openCodeCliBaseUrl = getOauthConfig().OPEN_CODE_CLI_ORIGIN;
    const accountInfo = getOauthAccountInfo();
    const orgUuid = accountInfo?.organizationUuid;
    let authUrl: string;
    if (orgUuid && server.config.type === 'openCodeCli-proxy' && server.config.id) {
      const serverId = server.config.id.startsWith('mcprs') ? 'mcpsrv' + server.config.id.slice(5) : server.config.id;
      const productSurface = encodeURIComponent(getOpenCodeCliEnv('LAUNCH_MODE') || 'cli');
      authUrl = `${openCodeCliBaseUrl}/api/organizations/${orgUuid}/mcp/start-auth/${serverId}?product_surface=${productSurface}`;
    } else {
      authUrl = `${openCodeCliBaseUrl}/settings/connectors`;
    }
    setOpenCodeCliAuthUrl(authUrl);
    setIsOpenCodeCliAuthenticating(true);
    logEvent('open_code_cli_openCodeCli_mcp_auth_started', {});
    await openBrowser(authUrl);
  }, [server.config]);
  const handleOpenCodeCliClearAuth = React.useCallback(() => {
    setIsOpenCodeCliClearingAuth(true);
    logEvent('open_code_cli_openCodeCli_mcp_clear_auth_started', {});
  }, []);
  const handleToggleEnabled = React.useCallback(async () => {
    const wasEnabled = server.client.type !== 'disabled';
    try {
      await toggleMcpServer(server.name);
      if (server.config.type === 'openCodeCli-proxy') {
        logEvent('open_code_cli_openCodeCli_mcp_toggle', {
          new_state: (wasEnabled ? 'disabled' : 'enabled') as AnalyticsScalarMetadata
        });
      }
      onCancel();
    } catch (err_0) {
      const action = wasEnabled ? 'disable' : 'enable';
      onComplete?.(`Failed to ${action} MCP server '${server.name}': ${errorMessage(err_0)}`);
    }
  }, [server.client.type, server.config.type, server.name, toggleMcpServer, onCancel, onComplete]);
  const handleAuthenticate = React.useCallback(async () => {
    if (server.config.type === 'openCodeCli-proxy') return;
    setIsAuthenticating(true);
    setError(null);
    const controller = new AbortController();
    authAbortControllerRef.current = controller;
    try {
      if (server.isAuthenticated && server.config) {
        await revokeServerTokens(server.name, server.config, {
          preserveStepUpState: true
        });
      }
      if (server.config) {
        await performMCPOAuthFlow(server.name, server.config, setAuthorizationUrl, controller.signal, {
          onWaitingForCallback: submit => {
            setManualCallbackSubmit(() => submit);
          }
        });
        logEvent('open_code_cli_mcp_auth_config_authenticate', {
          wasAuthenticated: server.isAuthenticated
        });
        const result_0 = await reconnectMcpServer(server.name);
        if (result_0.client.type === 'connected') {
          const message = isEffectivelyAuthenticated ? `Authentication successful. Reconnected to ${server.name}.` : `Authentication successful. Connected to ${server.name}.`;
          onComplete?.(message);
        } else if (result_0.client.type === 'needs-auth') {
          onComplete?.('Authentication successful, but server still requires authentication. You may need to manually restart Open Code CLI.');
        } else {
          logMCPDebug(server.name, `Reconnection failed after authentication`);
          onComplete?.('Authentication successful, but server reconnection failed. You may need to manually restart Open Code CLI for the changes to take effect.');
        }
      }
    } catch (err_1) {
      if (err_1 instanceof Error && !(err_1 instanceof AuthenticationCancelledError)) {
        setError(err_1.message);
      }
    } finally {
      setIsAuthenticating(false);
      authAbortControllerRef.current = null;
      setManualCallbackSubmit(null);
      setCallbackUrlInput('');
    }
  }, [server.isAuthenticated, server.config, server.name, onComplete, reconnectMcpServer, isEffectivelyAuthenticated]);
  const handleClearAuth = async () => {
    if (server.config.type === 'openCodeCli-proxy') return;
    if (server.config) {
      await revokeServerTokens(server.name, server.config);
      logEvent('open_code_cli_mcp_auth_config_clear', {});
      await clearServerCache(server.name, {
        ...server.config,
        scope: server.scope
      });
      setAppState(prev_0 => {
        const newClients_0 = prev_0.mcp.clients.map(c_0 =>
        c_0.name === server.name ? {
          ...c_0,
          type: 'failed' as const
        } : c_0);
        const newTools_0 = excludeToolsByServer(prev_0.mcp.tools, server.name);
        const newCommands_0 = excludeCommandsByServer(prev_0.mcp.commands, server.name);
        const newResources_0 = excludeResourcesByServer(prev_0.mcp.resources, server.name);
        return {
          ...prev_0,
          mcp: {
            ...prev_0.mcp,
            clients: newClients_0,
            tools: newTools_0,
            commands: newCommands_0,
            resources: newResources_0
          }
        };
      });
      onComplete?.(`Authentication cleared for ${server.name}.`);
    }
  };
  if (isAuthenticating) {
    const authCopy = server.config.type !== 'openCodeCli-proxy' && server.config.oauth?.xaa ? ' Authenticating via your identity provider' : ' A browser window will open for authentication';
    return <Box flexDirection="column" gap={1} padding={1}>
        <Text color="open-code-cli">Authenticating with {server.name}…</Text>
        <Box>
          <Spinner />
          <Text>{authCopy}</Text>
        </Box>
        {authorizationUrl && <Box flexDirection="column">
            <Box>
              <Text dimColor>
                If your browser doesn&apos;t open automatically, copy this URL
                manually{' '}
              </Text>
              {urlCopied ? <Text color="success">(Copied!)</Text> : <Text dimColor>
                  <KeyboardShortcutHint shortcut="c" action="copy" parens />
                </Text>}
            </Box>
            <Link url={authorizationUrl} />
          </Box>}
        {isAuthenticating && authorizationUrl && manualCallbackSubmit && <Box flexDirection="column" marginTop={1}>
            <Text dimColor>
              If the redirect page shows a connection error, paste the URL from
              your browser&apos;s address bar:
            </Text>
            <Box>
              <Text dimColor>URL {'>'} </Text>
              <TextInput value={callbackUrlInput} onChange={setCallbackUrlInput} onSubmit={(value: string) => {
            manualCallbackSubmit(value.trim());
            setCallbackUrlInput('');
          }} cursorOffset={callbackUrlCursorOffset} onChangeCursorOffset={setCallbackUrlCursorOffset} columns={terminalColumns - 8} />
            </Box>
          </Box>}
        <Box marginLeft={3}>
          <Text dimColor>
            Return here after authenticating in your browser. Press Esc to go
            back.
          </Text>
        </Box>
      </Box>;
  }
  if (isOpenCodeCliAuthenticating) {
    return <Box flexDirection="column" gap={1} padding={1}>
        <Text color="open-code-cli">Authenticating with {server.name}…</Text>
        <Box>
          <Spinner />
          <Text> A browser window will open for authentication</Text>
        </Box>
        {openCodeCliAIAuthUrl && <Box flexDirection="column">
            <Box>
              <Text dimColor>
                If your browser doesn&apos;t open automatically, copy this URL
                manually{' '}
              </Text>
              {urlCopied ? <Text color="success">(Copied!)</Text> : <Text dimColor>
                  <KeyboardShortcutHint shortcut="c" action="copy" parens />
                </Text>}
            </Box>
            <Link url={openCodeCliAIAuthUrl} />
          </Box>}
        <Box marginLeft={3} flexDirection="column">
          <Text color="permission">
            Press <Text bold>Enter</Text> after authenticating in your browser.
          </Text>
          <Text dimColor italic>
            <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="back" />
          </Text>
        </Box>
      </Box>;
  }
  if (isOpenCodeCliClearingAuth) {
    return <Box flexDirection="column" gap={1} padding={1}>
        <Text color="open-code-cli">Clear authentication for {server.name}</Text>
        {openCodeCliAIClearAuthBrowserOpened ? <>
            <Text>
              Find the MCP server in the browser and click
              &quot;Disconnect&quot;.
            </Text>
            {openCodeCliAIClearAuthUrl && <Box flexDirection="column">
                <Box>
                  <Text dimColor>
                    If your browser didn&apos;t open automatically, copy this
                    URL manually{' '}
                  </Text>
                  {urlCopied ? <Text color="success">(Copied!)</Text> : <Text dimColor>
                      <KeyboardShortcutHint shortcut="c" action="copy" parens />
                    </Text>}
                </Box>
                <Link url={openCodeCliAIClearAuthUrl} />
              </Box>}
            <Box marginLeft={3} flexDirection="column">
              <Text color="permission">
                Press <Text bold>Enter</Text> when done.
              </Text>
              <Text dimColor italic>
                <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="back" />
              </Text>
            </Box>
          </> : <>
            <Text>
              This will open Open Code CLI in the browser. Find the MCP server in
              the list and click &quot;Disconnect&quot;.
            </Text>
            <Box marginLeft={3} flexDirection="column">
              <Text color="permission">
                Press <Text bold>Enter</Text> to open the browser.
              </Text>
              <Text dimColor italic>
                <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="back" />
              </Text>
            </Box>
          </>}
      </Box>;
  }
  if (isReconnecting) {
    return <Box flexDirection="column" gap={1} padding={1}>
        <Text color="text">
          Connecting to <Text bold>{server.name}</Text>…
        </Text>
        <Box>
          <Spinner />
          <Text> Establishing connection to MCP server</Text>
        </Box>
        <Text dimColor>This may take a few moments.</Text>
      </Box>;
  }
  const menuOptions: { label: string; value: string }[] = [];
  if (server.client.type === 'disabled') {
    menuOptions.push({
      label: 'Enable',
      value: 'toggle-enabled'
    });
  }
  if (server.client.type === 'connected' && serverToolsCount > 0) {
    menuOptions.push({
      label: 'View tools',
      value: 'tools'
    });
  }
  if (server.config.type === 'openCodeCli-proxy') {
    if (server.client.type === 'connected') {
      menuOptions.push({
        label: 'Clear authentication',
        value: 'openCodeCli-clear-auth'
      });
    } else if (server.client.type !== 'disabled') {
      menuOptions.push({
        label: 'Authenticate',
        value: 'openCodeCli-auth'
      });
    }
  } else {
    if (isEffectivelyAuthenticated) {
      menuOptions.push({
        label: 'Re-authenticate',
        value: 'reauth'
      });
      menuOptions.push({
        label: 'Clear authentication',
        value: 'clear-auth'
      });
    }
    if (!isEffectivelyAuthenticated) {
      menuOptions.push({
        label: 'Authenticate',
        value: 'auth'
      });
    }
  }
  if (server.client.type !== 'disabled') {
    if (server.client.type !== 'needs-auth') {
      menuOptions.push({
        label: 'Reconnect',
        value: 'reconnectMcpServer'
      });
    }
    menuOptions.push({
      label: 'Disable',
      value: 'toggle-enabled'
    });
  }
  if (menuOptions.length === 0) {
    menuOptions.push({
      label: 'Back',
      value: 'back'
    });
  }
  return <Box flexDirection="column">
      <Box flexDirection="column" paddingX={1} borderStyle={borderless ? undefined : 'round'}>
        <Box marginBottom={1}>
          <Text bold>{capitalizedServerName} MCP Server</Text>
        </Box>
        <Box flexDirection="column" gap={0}>
          <Box>
            <Text bold>Status: </Text>
            {server.client.type === 'disabled' ? <Text>{color('inactive', theme)(figures.radioOff)} disabled</Text> : server.client.type === 'connected' ? <Text>{color('success', theme)(figures.tick)} connected</Text> : server.client.type === 'pending' ? <>
                <Text dimColor>{figures.radioOff}</Text>
                <Text> connecting…</Text>
              </> : server.client.type === 'needs-auth' ? <Text>
                {color('warning', theme)(figures.triangleUpOutline)} needs
                authentication
              </Text> : <Text>{color('error', theme)(figures.cross)} failed</Text>}
          </Box>
          {server.transport !== 'openCodeCli-proxy' && <Box>
              <Text bold>Auth: </Text>
              {isEffectivelyAuthenticated ? <Text>
                  {color('success', theme)(figures.tick)} authenticated
                </Text> : <Text>
                  {color('error', theme)(figures.cross)} not authenticated
                </Text>}
            </Box>}
          <Box>
            <Text bold>URL: </Text>
            <Text dimColor>{server.config.url}</Text>
          </Box>
          <Box>
            <Text bold>Config location: </Text>
            <Text dimColor>{describeMcpConfigFilePath(server.scope)}</Text>
          </Box>
          {server.client.type === 'connected' && <CapabilitiesSection serverToolsCount={serverToolsCount} serverPromptsCount={serverCommandsCount} serverResourcesCount={mcp.resources[server.name]?.length || 0} />}
          {server.client.type === 'connected' && serverToolsCount > 0 && <Box>
              <Text bold>Tools: </Text>
              <Text dimColor>{serverToolsCount} tools</Text>
            </Box>}
        </Box>
        {error && <Box marginTop={1}>
            <Text color="error">Error: {error}</Text>
          </Box>}
        {menuOptions.length > 0 && <Box marginTop={1}>
            <Select options={menuOptions} onChange={async value_0 => {
          switch (value_0) {
            case 'tools':
              onViewTools();
              break;
            case 'auth':
            case 'reauth':
              await handleAuthenticate();
              break;
            case 'clear-auth':
              await handleClearAuth();
              break;
            case 'openCodeCli-auth':
              await handleOpenCodeCliAuth();
              break;
            case 'openCodeCli-clear-auth':
              handleOpenCodeCliClearAuth();
              break;
            case 'reconnectMcpServer':
              setIsReconnecting(true);
              try {
                const result_1 = await reconnectMcpServer(server.name);
                if (server.config.type === 'openCodeCli-proxy') {
                  logEvent('open_code_cli_openCodeCli_mcp_reconnect', {
                    success: result_1.client.type === 'connected'
                  });
                }
                const {
                  message: message_0
                } = handleReconnectResult(result_1, server.name);
                onComplete?.(message_0);
              } catch (err_2) {
                if (server.config.type === 'openCodeCli-proxy') {
                  logEvent('open_code_cli_openCodeCli_mcp_reconnect', {
                    success: false
                  });
                }
                onComplete?.(handleReconnectError(err_2, server.name));
              } finally {
                setIsReconnecting(false);
              }
              break;
            case 'toggle-enabled':
              await handleToggleEnabled();
              break;
            case 'back':
              onCancel();
              break;
          }
        }} onCancel={onCancel} />
          </Box>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor italic>
          {exitState.pending ? <>Press {exitState.keyName} again to exit</> : <Byline>
              <KeyboardShortcutHint shortcut="↑↓" action="navigate" />
              <KeyboardShortcutHint shortcut="Enter" action="select" />
              <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="back" />
            </Byline>}
        </Text>
      </Box>
    </Box>;
}
