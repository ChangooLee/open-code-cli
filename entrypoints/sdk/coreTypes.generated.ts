import type { z } from 'zod/v4'
import type {
  ModelUsageSchema,
  OutputFormatTypeSchema,
  BaseOutputFormatSchema,
  JsonSchemaOutputFormatSchema,
  OutputFormatSchema,
  ApiKeySourceSchema,
  ConfigScopeSchema,
  SdkApiHeaderSchema,
  ThinkingAdaptiveSchema,
  ThinkingEnabledSchema,
  ThinkingDisabledSchema,
  ThinkingConfigSchema,
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpHttpServerConfigSchema,
  McpSdkServerConfigSchema,
  McpServerConfigForProcessTransportSchema,
  McpOpenCodeCliProxyServerConfigSchema,
  McpServerStatusConfigSchema,
  McpServerStatusSchema,
  McpSetServersResultSchema,
  PermissionUpdateDestinationSchema,
  PermissionBehaviorSchema,
  PermissionRuleValueSchema,
  PermissionUpdateSchema,
  PermissionDecisionClassificationSchema,
  PermissionResultSchema,
  PermissionModeSchema,
  HookEventSchema,
  BaseHookInputSchema,
  BeforeToolInvokeHookInputSchema,
  OnOnPermissionRequestHookInputSchema,
  AfterToolInvokeHookInputSchema,
  AfterToolInvokeFailureHookInputSchema,
  PermissionDeniedHookInputSchema,
  OnNotificationHookInputSchema,
  OnUserPromptHookInputSchema,
  OnSessionStartHookInputSchema,
  SetupHookInputSchema,
  OnAgentOnAgentStopHookInputSchema,
  OnAgentOnAgentStopFailureHookInputSchema,
  SubagentStartHookInputSchema,
  SubagentOnAgentOnAgentStopHookInputSchema,
  BeforeContextCompactHookInputSchema,
  AfterContextCompactHookInputSchema,
  TeammateIdleHookInputSchema,
  TaskCreatedHookInputSchema,
  TaskCompletedHookInputSchema,
  ElicitationHookInputSchema,
  ElicitationResultHookInputSchema,
  ConfigChangeHookInputSchema,
  InstructionsLoadedHookInputSchema,
  WorktreeCreateHookInputSchema,
  WorktreeRemoveHookInputSchema,
  CwdChangedHookInputSchema,
  FileChangedHookInputSchema,
  ExitReasonSchema,
  SessionEndHookInputSchema,
  HookInputSchema,
  AsyncHookJSONOutputSchema,
  BeforeToolInvokeHookSpecificOutputSchema,
  OnUserPromptHookSpecificOutputSchema,
  OnSessionStartHookSpecificOutputSchema,
  SetupHookSpecificOutputSchema,
  SubagentStartHookSpecificOutputSchema,
  AfterToolInvokeHookSpecificOutputSchema,
  AfterToolInvokeFailureHookSpecificOutputSchema,
  PermissionDeniedHookSpecificOutputSchema,
  OnNotificationHookSpecificOutputSchema,
  OnOnPermissionRequestHookSpecificOutputSchema,
  CwdChangedHookSpecificOutputSchema,
  FileChangedHookSpecificOutputSchema,
  SyncHookJSONOutputSchema,
  ElicitationHookSpecificOutputSchema,
  ElicitationResultHookSpecificOutputSchema,
  WorktreeCreateHookSpecificOutputSchema,
  HookJSONOutputSchema,
  PromptRequestOptionSchema,
  PromptRequestSchema,
  PromptResponseSchema,
  SlashCommandSchema,
  AgentInfoSchema,
  ModelInfoSchema,
  AccountInfoSchema,
  AgentMcpServerSpecSchema,
  AgentDefinitionSchema,
  SettingSourceSchema,
  SdkPluginConfigSchema,
  RewindFilesResultSchema,
  SDKAssistantMessageErrorSchema,
  SDKStatusSchema,
  SDKUserMessageSchema,
  SDKUserMessageReplaySchema,
  SDKRateLimitInfoSchema,
  SDKAssistantMessageSchema,
  SDKRateLimitEventSchema,
  SDKStreamlinedTextMessageSchema,
  SDKStreamlinedToolUseSummaryMessageSchema,
  SDKPermissionDenialSchema,
  SDKResultSuccessSchema,
  SDKResultErrorSchema,
  SDKResultMessageSchema,
  SDKSystemMessageSchema,
  SDKPartialAssistantMessageSchema,
  SDKCompactBoundaryMessageSchema,
  SDKStatusMessageSchema,
  SDKPostTurnSummaryMessageSchema,
  SDKAPIRetryMessageSchema,
  SDKLocalCommandOutputMessageSchema,
  SDKHookStartedMessageSchema,
  SDKHookProgressMessageSchema,
  SDKHookResponseMessageSchema,
  SDKToolProgressMessageSchema,
  SDKAuthStatusMessageSchema,
  SDKFilesPersistedEventSchema,
  SDKTaskNotificationMessageSchema,
  SDKTaskStartedMessageSchema,
  SDKSessionStateChangedMessageSchema,
  SDKTaskProgressMessageSchema,
  SDKToolUseSummaryMessageSchema,
  SDKElicitationCompleteMessageSchema,
  SDKPromptSuggestionMessageSchema,
  SDKSessionInfoSchema,
  SDKMessageSchema,
  FastModeStateSchema,
} from './coreSchemas.js'
export type ModelUsage = z.infer<ReturnType<typeof ModelUsageSchema>>
export type OutputFormatType = z.infer<ReturnType<typeof OutputFormatTypeSchema>>
export type BaseOutputFormat = z.infer<ReturnType<typeof BaseOutputFormatSchema>>
export type JsonSchemaOutputFormat = z.infer<ReturnType<typeof JsonSchemaOutputFormatSchema>>
export type OutputFormat = z.infer<ReturnType<typeof OutputFormatSchema>>
export type ApiKeySource = z.infer<ReturnType<typeof ApiKeySourceSchema>>
export type ConfigScope = z.infer<ReturnType<typeof ConfigScopeSchema>>
export type SdkApiHeader = z.infer<ReturnType<typeof SdkApiHeaderSchema>>
export type ThinkingAdaptive = z.infer<ReturnType<typeof ThinkingAdaptiveSchema>>
export type ThinkingEnabled = z.infer<ReturnType<typeof ThinkingEnabledSchema>>
export type ThinkingDisabled = z.infer<ReturnType<typeof ThinkingDisabledSchema>>
export type ThinkingConfig = z.infer<ReturnType<typeof ThinkingConfigSchema>>
export type McpStdioServerConfig = z.infer<ReturnType<typeof McpStdioServerConfigSchema>>
export type McpSSEServerConfig = z.infer<ReturnType<typeof McpSSEServerConfigSchema>>
export type McpHttpServerConfig = z.infer<ReturnType<typeof McpHttpServerConfigSchema>>
export type McpSdkServerConfig = z.infer<ReturnType<typeof McpSdkServerConfigSchema>>
export type McpServerConfigForProcessTransport = z.infer<ReturnType<typeof McpServerConfigForProcessTransportSchema>>
export type McpOpenCodeCliProxyServerConfig = z.infer<ReturnType<typeof McpOpenCodeCliProxyServerConfigSchema>>
export type McpServerStatusConfig = z.infer<ReturnType<typeof McpServerStatusConfigSchema>>
export type McpServerStatus = z.infer<ReturnType<typeof McpServerStatusSchema>>
export type McpSetServersResult = z.infer<ReturnType<typeof McpSetServersResultSchema>>
export type PermissionUpdateDestination = z.infer<ReturnType<typeof PermissionUpdateDestinationSchema>>
export type PermissionBehavior = z.infer<ReturnType<typeof PermissionBehaviorSchema>>
export type PermissionRuleValue = z.infer<ReturnType<typeof PermissionRuleValueSchema>>
export type PermissionUpdate = z.infer<ReturnType<typeof PermissionUpdateSchema>>
export type PermissionDecisionClassification = z.infer<ReturnType<typeof PermissionDecisionClassificationSchema>>
export type PermissionResult = z.infer<ReturnType<typeof PermissionResultSchema>>
export type PermissionMode = z.infer<ReturnType<typeof PermissionModeSchema>>
export type HookEvent = z.infer<ReturnType<typeof HookEventSchema>>
export type BaseHookInput = z.infer<ReturnType<typeof BaseHookInputSchema>>
export type BeforeToolInvokeHookInput = z.infer<ReturnType<typeof BeforeToolInvokeHookInputSchema>>
export type OnPermissionRequestHookInput = z.infer<ReturnType<typeof OnOnPermissionRequestHookInputSchema>>
export type AfterToolInvokeHookInput = z.infer<ReturnType<typeof AfterToolInvokeHookInputSchema>>
export type AfterToolInvokeFailureHookInput = z.infer<ReturnType<typeof AfterToolInvokeFailureHookInputSchema>>
export type PermissionDeniedHookInput = z.infer<ReturnType<typeof PermissionDeniedHookInputSchema>>
export type NotificationHookInput = z.infer<ReturnType<typeof OnNotificationHookInputSchema>>
export type OnUserPromptHookInput = z.infer<ReturnType<typeof OnUserPromptHookInputSchema>>
export type OnSessionStartHookInput = z.infer<ReturnType<typeof OnSessionStartHookInputSchema>>
export type SetupHookInput = z.infer<ReturnType<typeof SetupHookInputSchema>>
export type OnAgentStopHookInput = z.infer<ReturnType<typeof OnAgentOnAgentStopHookInputSchema>>
export type OnAgentStopFailureHookInput = z.infer<ReturnType<typeof OnAgentOnAgentStopFailureHookInputSchema>>
export type SubagentStartHookInput = z.infer<ReturnType<typeof SubagentStartHookInputSchema>>
export type SubagentOnAgentStopHookInput = z.infer<ReturnType<typeof SubagentOnAgentOnAgentStopHookInputSchema>>
export type BeforeContextCompactHookInput = z.infer<ReturnType<typeof BeforeContextCompactHookInputSchema>>
export type AfterContextCompactHookInput = z.infer<ReturnType<typeof AfterContextCompactHookInputSchema>>
export type TeammateIdleHookInput = z.infer<ReturnType<typeof TeammateIdleHookInputSchema>>
export type TaskCreatedHookInput = z.infer<ReturnType<typeof TaskCreatedHookInputSchema>>
export type TaskCompletedHookInput = z.infer<ReturnType<typeof TaskCompletedHookInputSchema>>
export type ElicitationHookInput = z.infer<ReturnType<typeof ElicitationHookInputSchema>>
export type ElicitationResultHookInput = z.infer<ReturnType<typeof ElicitationResultHookInputSchema>>
export type ConfigChangeHookInput = z.infer<ReturnType<typeof ConfigChangeHookInputSchema>>
export type InstructionsLoadedHookInput = z.infer<ReturnType<typeof InstructionsLoadedHookInputSchema>>
export type WorktreeCreateHookInput = z.infer<ReturnType<typeof WorktreeCreateHookInputSchema>>
export type WorktreeRemoveHookInput = z.infer<ReturnType<typeof WorktreeRemoveHookInputSchema>>
export type CwdChangedHookInput = z.infer<ReturnType<typeof CwdChangedHookInputSchema>>
export type FileChangedHookInput = z.infer<ReturnType<typeof FileChangedHookInputSchema>>
export type ExitReason = z.infer<ReturnType<typeof ExitReasonSchema>>
export type SessionEndHookInput = z.infer<ReturnType<typeof SessionEndHookInputSchema>>
export type HookInput = z.infer<ReturnType<typeof HookInputSchema>>
export type AsyncHookJSONOutput = z.infer<ReturnType<typeof AsyncHookJSONOutputSchema>>
export type BeforeToolInvokeHookSpecificOutput = z.infer<ReturnType<typeof BeforeToolInvokeHookSpecificOutputSchema>>
export type OnUserPromptHookSpecificOutput = z.infer<ReturnType<typeof OnUserPromptHookSpecificOutputSchema>>
export type OnSessionStartHookSpecificOutput = z.infer<ReturnType<typeof OnSessionStartHookSpecificOutputSchema>>
export type SetupHookSpecificOutput = z.infer<ReturnType<typeof SetupHookSpecificOutputSchema>>
export type SubagentStartHookSpecificOutput = z.infer<ReturnType<typeof SubagentStartHookSpecificOutputSchema>>
export type AfterToolInvokeHookSpecificOutput = z.infer<ReturnType<typeof AfterToolInvokeHookSpecificOutputSchema>>
export type AfterToolInvokeFailureHookSpecificOutput = z.infer<ReturnType<typeof AfterToolInvokeFailureHookSpecificOutputSchema>>
export type PermissionDeniedHookSpecificOutput = z.infer<ReturnType<typeof PermissionDeniedHookSpecificOutputSchema>>
export type NotificationHookSpecificOutput = z.infer<ReturnType<typeof OnNotificationHookSpecificOutputSchema>>
export type OnPermissionRequestHookSpecificOutput = z.infer<ReturnType<typeof OnOnPermissionRequestHookSpecificOutputSchema>>
export type CwdChangedHookSpecificOutput = z.infer<ReturnType<typeof CwdChangedHookSpecificOutputSchema>>
export type FileChangedHookSpecificOutput = z.infer<ReturnType<typeof FileChangedHookSpecificOutputSchema>>
export type SyncHookJSONOutput = z.infer<ReturnType<typeof SyncHookJSONOutputSchema>>
export type ElicitationHookSpecificOutput = z.infer<ReturnType<typeof ElicitationHookSpecificOutputSchema>>
export type ElicitationResultHookSpecificOutput = z.infer<ReturnType<typeof ElicitationResultHookSpecificOutputSchema>>
export type WorktreeCreateHookSpecificOutput = z.infer<ReturnType<typeof WorktreeCreateHookSpecificOutputSchema>>
export type HookJSONOutput = z.infer<ReturnType<typeof HookJSONOutputSchema>>
export type PromptRequestOption = z.infer<ReturnType<typeof PromptRequestOptionSchema>>
export type PromptRequest = z.infer<ReturnType<typeof PromptRequestSchema>>
export type PromptResponse = z.infer<ReturnType<typeof PromptResponseSchema>>
export type SlashCommand = z.infer<ReturnType<typeof SlashCommandSchema>>
export type AgentInfo = z.infer<ReturnType<typeof AgentInfoSchema>>
export type ModelInfo = z.infer<ReturnType<typeof ModelInfoSchema>>
export type AccountInfo = z.infer<ReturnType<typeof AccountInfoSchema>>
export type AgentMcpServerSpec = z.infer<ReturnType<typeof AgentMcpServerSpecSchema>>
export type AgentDefinition = z.infer<ReturnType<typeof AgentDefinitionSchema>>
export type SettingSource = z.infer<ReturnType<typeof SettingSourceSchema>>
export type SdkPluginConfig = z.infer<ReturnType<typeof SdkPluginConfigSchema>>
export type RewindFilesResult = z.infer<ReturnType<typeof RewindFilesResultSchema>>
export type SDKAssistantMessageError = z.infer<ReturnType<typeof SDKAssistantMessageErrorSchema>>
export type SDKStatus = z.infer<ReturnType<typeof SDKStatusSchema>>
export type SDKUserMessage = z.infer<ReturnType<typeof SDKUserMessageSchema>>
export type SDKUserMessageReplay = z.infer<ReturnType<typeof SDKUserMessageReplaySchema>>
export type SDKRateLimitInfo = z.infer<ReturnType<typeof SDKRateLimitInfoSchema>>
export type SDKAssistantMessage = z.infer<ReturnType<typeof SDKAssistantMessageSchema>>
export type SDKRateLimitEvent = z.infer<ReturnType<typeof SDKRateLimitEventSchema>>
export type SDKStreamlinedTextMessage = z.infer<ReturnType<typeof SDKStreamlinedTextMessageSchema>>
export type SDKStreamlinedToolUseSummaryMessage = z.infer<ReturnType<typeof SDKStreamlinedToolUseSummaryMessageSchema>>
export type SDKPermissionDenial = z.infer<ReturnType<typeof SDKPermissionDenialSchema>>
export type SDKResultSuccess = z.infer<ReturnType<typeof SDKResultSuccessSchema>>
export type SDKResultError = z.infer<ReturnType<typeof SDKResultErrorSchema>>
export type SDKResultMessage = z.infer<ReturnType<typeof SDKResultMessageSchema>>
export type SDKSystemMessage = z.infer<ReturnType<typeof SDKSystemMessageSchema>>
export type SDKPartialAssistantMessage = z.infer<ReturnType<typeof SDKPartialAssistantMessageSchema>>
export type SDKCompactBoundaryMessage = z.infer<ReturnType<typeof SDKCompactBoundaryMessageSchema>>
export type SDKStatusMessage = z.infer<ReturnType<typeof SDKStatusMessageSchema>>
export type SDKPostTurnSummaryMessage = z.infer<ReturnType<typeof SDKPostTurnSummaryMessageSchema>>
export type SDKAPIRetryMessage = z.infer<ReturnType<typeof SDKAPIRetryMessageSchema>>
export type SDKLocalCommandOutputMessage = z.infer<ReturnType<typeof SDKLocalCommandOutputMessageSchema>>
export type SDKHookStartedMessage = z.infer<ReturnType<typeof SDKHookStartedMessageSchema>>
export type SDKHookProgressMessage = z.infer<ReturnType<typeof SDKHookProgressMessageSchema>>
export type SDKHookResponseMessage = z.infer<ReturnType<typeof SDKHookResponseMessageSchema>>
export type SDKToolProgressMessage = z.infer<ReturnType<typeof SDKToolProgressMessageSchema>>
export type SDKAuthStatusMessage = z.infer<ReturnType<typeof SDKAuthStatusMessageSchema>>
export type SDKFilesPersistedEvent = z.infer<ReturnType<typeof SDKFilesPersistedEventSchema>>
export type SDKTaskNotificationMessage = z.infer<ReturnType<typeof SDKTaskNotificationMessageSchema>>
export type SDKTaskStartedMessage = z.infer<ReturnType<typeof SDKTaskStartedMessageSchema>>
export type SDKSessionStateChangedMessage = z.infer<ReturnType<typeof SDKSessionStateChangedMessageSchema>>
export type SDKTaskProgressMessage = z.infer<ReturnType<typeof SDKTaskProgressMessageSchema>>
export type SDKToolUseSummaryMessage = z.infer<ReturnType<typeof SDKToolUseSummaryMessageSchema>>
export type SDKElicitationCompleteMessage = z.infer<ReturnType<typeof SDKElicitationCompleteMessageSchema>>
export type SDKPromptSuggestionMessage = z.infer<ReturnType<typeof SDKPromptSuggestionMessageSchema>>
export type SDKSessionInfo = z.infer<ReturnType<typeof SDKSessionInfoSchema>>
export type SDKMessage = z.infer<ReturnType<typeof SDKMessageSchema>>
export type FastModeState = z.infer<ReturnType<typeof FastModeStateSchema>>
