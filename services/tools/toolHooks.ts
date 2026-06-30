import { type AnalyticsScalarMetadata, logEvent, } from 'src/services/analytics/index.js';
import { sanitizeToolNameForAnalytics } from 'src/services/analytics/metadata.js';
import type z from 'zod/v4';
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js';
import type { AnyObject, Tool, ToolUseContext } from '../../Tool.js';
import type { HookProgress } from '../../types/hooks.js';
import type { AssistantMessage, AttachmentMessage, ProgressMessage, } from '../../types/message.js';
import type { PermissionDecision } from '../../types/permissions.js';
import { createAttachmentMessage } from '../../utils/attachments.js';
import { logForDebugging } from '../../utils/debug.js';
import { executeAfterToolInvokeHooks, executeAfterToolInvokeFailureHooks, executeBeforeToolInvokeHooks, getBeforeToolInvokeHookBlockingMessage, } from '../../utils/hooks.js';
import { logError } from '../../utils/log.js';
import { getRuleBehaviorDescription, type PermissionDecisionReason, type PermissionResult, } from '../../utils/permissions/PermissionResult.js';
import { checkRuleBasedPermissions } from '../../utils/permissions/permissions.js';
import { formatError } from '../../utils/toolErrors.js';
import { isMcpTool } from '../mcp/utils.js';
import type { McpServerType, MessageUpdateLazy } from './toolExecution.js';
export type AfterToolInvokeHooksResult<Output> = MessageUpdateLazy<AttachmentMessage | ProgressMessage<HookProgress>> | {
    updatedMCPToolOutput: Output;
};
export async function* runAfterToolInvokeHooks<Input extends AnyObject, Output>(toolUseContext: ToolUseContext, tool: Tool<Input, Output>, toolUseID: string, messageId: string, toolInput: Record<string, unknown>, toolResponse: Output, requestId: string | undefined, mcpServerType: McpServerType, mcpServerBaseUrl: string | undefined): AsyncGenerator<AfterToolInvokeHooksResult<Output>> {
    const postToolStartTime = Date.now();
    try {
        const appState = toolUseContext.getAppState();
        const permissionMode = appState.toolPermissionContext.mode;
        let toolOutput = toolResponse;
        for await (const result of executeAfterToolInvokeHooks(tool.name, toolUseID, toolInput, toolOutput, toolUseContext, permissionMode, toolUseContext.abortController.signal)) {
            try {
                if (result.message?.type === 'attachment' &&
                    result.message.attachment.type === 'hook_cancelled') {
                    logEvent('open_code_cli_post_tool_hooks_cancelled', {
                        toolName: sanitizeToolNameForAnalytics(tool.name),
                        queryChainId: toolUseContext.queryTracking
                            ?.chainId as AnalyticsScalarMetadata,
                        queryDepth: toolUseContext.queryTracking?.depth,
                    });
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_cancelled',
                            hookName: `AfterToolInvoke:${tool.name}`,
                            toolUseID,
                            hookEvent: 'AfterToolInvoke',
                        }),
                    };
                    continue;
                }
                if (result.message &&
                    !(result.message.type === 'attachment' &&
                        result.message.attachment.type === 'hook_blocking_error')) {
                    yield { message: result.message as any };
                }
                if (result.blockingError) {
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_blocking_error',
                            hookName: `AfterToolInvoke:${tool.name}`,
                            toolUseID: toolUseID,
                            hookEvent: 'AfterToolInvoke',
                            blockingError: result.blockingError,
                        }),
                    };
                }
                if (result.preventContinuation) {
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_stopped_continuation',
                            message: result.stopReason || 'Execution stopped by AfterToolInvoke hook',
                            hookName: `AfterToolInvoke:${tool.name}`,
                            toolUseID: toolUseID,
                            hookEvent: 'AfterToolInvoke',
                        }),
                    };
                    return;
                }
                if (result.additionalContexts && result.additionalContexts.length > 0) {
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_additional_context',
                            content: result.additionalContexts,
                            hookName: `AfterToolInvoke:${tool.name}`,
                            toolUseID: toolUseID,
                            hookEvent: 'AfterToolInvoke',
                        }),
                    };
                }
                if (result.updatedMCPToolOutput && isMcpTool(tool)) {
                    toolOutput = result.updatedMCPToolOutput as Output;
                    yield {
                        updatedMCPToolOutput: toolOutput,
                    };
                }
            }
            catch (error) {
                const postToolDurationMs = Date.now() - postToolStartTime;
                logEvent('open_code_cli_post_tool_hook_error', {
                    messageID: messageId as AnalyticsScalarMetadata,
                    toolName: sanitizeToolNameForAnalytics(tool.name),
                    isMcp: tool.isMcp ?? false,
                    duration: postToolDurationMs,
                    queryChainId: toolUseContext.queryTracking
                        ?.chainId as AnalyticsScalarMetadata,
                    queryDepth: toolUseContext.queryTracking?.depth,
                    ...(mcpServerType
                        ? {
                            mcpServerType: mcpServerType as AnalyticsScalarMetadata,
                        }
                        : {}),
                    ...(requestId
                        ? {
                            requestId: requestId as AnalyticsScalarMetadata,
                        }
                        : {}),
                });
                yield {
                    message: createAttachmentMessage({
                        type: 'hook_error_during_execution',
                        content: formatError(error),
                        hookName: `AfterToolInvoke:${tool.name}`,
                        toolUseID: toolUseID,
                        hookEvent: 'AfterToolInvoke',
                    }),
                };
            }
        }
    }
    catch (error) {
        logError(error);
    }
}
export async function* runAfterToolInvokeFailureHooks<Input extends AnyObject>(toolUseContext: ToolUseContext, tool: Tool<Input, unknown>, toolUseID: string, messageId: string, processedInput: z.infer<Input>, error: string, isInterrupt: boolean | undefined, requestId: string | undefined, mcpServerType: McpServerType, mcpServerBaseUrl: string | undefined): AsyncGenerator<MessageUpdateLazy<AttachmentMessage | ProgressMessage<HookProgress>>> {
    const postToolStartTime = Date.now();
    try {
        const appState = toolUseContext.getAppState();
        const permissionMode = appState.toolPermissionContext.mode;
        for await (const result of executeAfterToolInvokeFailureHooks(tool.name, toolUseID, processedInput, error, toolUseContext, isInterrupt, permissionMode, toolUseContext.abortController.signal)) {
            try {
                if (result.message?.type === 'attachment' &&
                    result.message.attachment.type === 'hook_cancelled') {
                    logEvent('open_code_cli_post_tool_failure_hooks_cancelled', {
                        toolName: sanitizeToolNameForAnalytics(tool.name),
                        queryChainId: toolUseContext.queryTracking
                            ?.chainId as AnalyticsScalarMetadata,
                        queryDepth: toolUseContext.queryTracking?.depth,
                    });
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_cancelled',
                            hookName: `AfterToolInvokeFailure:${tool.name}`,
                            toolUseID,
                            hookEvent: 'AfterToolInvokeFailure',
                        }),
                    };
                    continue;
                }
                if (result.message &&
                    !(result.message.type === 'attachment' &&
                        result.message.attachment.type === 'hook_blocking_error')) {
                    yield { message: result.message as any };
                }
                if (result.blockingError) {
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_blocking_error',
                            hookName: `AfterToolInvokeFailure:${tool.name}`,
                            toolUseID: toolUseID,
                            hookEvent: 'AfterToolInvokeFailure',
                            blockingError: result.blockingError,
                        }),
                    };
                }
                if (result.additionalContexts && result.additionalContexts.length > 0) {
                    yield {
                        message: createAttachmentMessage({
                            type: 'hook_additional_context',
                            content: result.additionalContexts,
                            hookName: `AfterToolInvokeFailure:${tool.name}`,
                            toolUseID: toolUseID,
                            hookEvent: 'AfterToolInvokeFailure',
                        }),
                    };
                }
            }
            catch (hookError) {
                const postToolDurationMs = Date.now() - postToolStartTime;
                logEvent('open_code_cli_post_tool_failure_hook_error', {
                    messageID: messageId as AnalyticsScalarMetadata,
                    toolName: sanitizeToolNameForAnalytics(tool.name),
                    isMcp: tool.isMcp ?? false,
                    duration: postToolDurationMs,
                    queryChainId: toolUseContext.queryTracking
                        ?.chainId as AnalyticsScalarMetadata,
                    queryDepth: toolUseContext.queryTracking?.depth,
                    ...(mcpServerType
                        ? {
                            mcpServerType: mcpServerType as AnalyticsScalarMetadata,
                        }
                        : {}),
                    ...(requestId
                        ? {
                            requestId: requestId as AnalyticsScalarMetadata,
                        }
                        : {}),
                });
                yield {
                    message: createAttachmentMessage({
                        type: 'hook_error_during_execution',
                        content: formatError(hookError),
                        hookName: `AfterToolInvokeFailure:${tool.name}`,
                        toolUseID: toolUseID,
                        hookEvent: 'AfterToolInvokeFailure',
                    }),
                };
            }
        }
    }
    catch (outerError) {
        logError(outerError);
    }
}
export async function resolveHookPermissionDecision(hookPermissionResult: PermissionResult | undefined, tool: Tool, input: Record<string, unknown>, toolUseContext: ToolUseContext, canUseTool: CanUseToolFn, assistantMessage: AssistantMessage, toolUseID: string): Promise<{
    decision: PermissionDecision;
    input: Record<string, unknown>;
}> {
    const requiresInteraction = tool.requiresUserInteraction?.();
    const requireCanUseTool = toolUseContext.requireCanUseTool;
    if (hookPermissionResult?.behavior === 'allow') {
        const hookInput = hookPermissionResult.updatedInput ?? input;
        const interactionSatisfied = requiresInteraction && hookPermissionResult.updatedInput !== undefined;
        if ((requiresInteraction && !interactionSatisfied) || requireCanUseTool) {
            logForDebugging(`Hook approved tool use for ${tool.name}, but canUseTool is required`);
            return {
                decision: await canUseTool(tool, hookInput, toolUseContext, assistantMessage, toolUseID),
                input: hookInput,
            };
        }
        const ruleCheck = await checkRuleBasedPermissions(tool, hookInput, toolUseContext);
        if (ruleCheck === null) {
            logForDebugging(interactionSatisfied
                ? `Hook satisfied user interaction for ${tool.name} via updatedInput`
                : `Hook approved tool use for ${tool.name}, bypassing permission prompt`);
            return { decision: hookPermissionResult, input: hookInput };
        }
        if (ruleCheck.behavior === 'deny') {
            logForDebugging(`Hook approved tool use for ${tool.name}, but deny rule overrides: ${ruleCheck.message}`);
            return { decision: ruleCheck, input: hookInput };
        }
        logForDebugging(`Hook approved tool use for ${tool.name}, but ask rule requires prompt`);
        return {
            decision: await canUseTool(tool, hookInput, toolUseContext, assistantMessage, toolUseID),
            input: hookInput,
        };
    }
    if (hookPermissionResult?.behavior === 'deny') {
        logForDebugging(`Hook denied tool use for ${tool.name}`);
        return { decision: hookPermissionResult, input };
    }
    const forceDecision = hookPermissionResult?.behavior === 'ask' ? hookPermissionResult : undefined;
    const askInput = hookPermissionResult?.behavior === 'ask' &&
        hookPermissionResult.updatedInput
        ? hookPermissionResult.updatedInput
        : input;
    return {
        decision: await canUseTool(tool, askInput, toolUseContext, assistantMessage, toolUseID, forceDecision),
        input: askInput,
    };
}
export async function* runBeforeToolInvokeHooks(toolUseContext: ToolUseContext, tool: Tool, processedInput: Record<string, unknown>, toolUseID: string, messageId: string, requestId: string | undefined, mcpServerType: McpServerType, mcpServerBaseUrl: string | undefined): AsyncGenerator<{
    type: 'message';
    message: MessageUpdateLazy<AttachmentMessage | ProgressMessage<HookProgress>>;
} | {
    type: 'hookPermissionResult';
    hookPermissionResult: PermissionResult;
} | {
    type: 'hookUpdatedInput';
    updatedInput: Record<string, unknown>;
} | {
    type: 'preventContinuation';
    shouldPreventContinuation: boolean;
} | {
    type: 'stopReason';
    stopReason: string;
} | {
    type: 'additionalContext';
    message: MessageUpdateLazy<AttachmentMessage>;
} | {
    type: 'stop';
}> {
    const hookStartTime = Date.now();
    try {
        const appState = toolUseContext.getAppState();
        for await (const result of executeBeforeToolInvokeHooks(tool.name, toolUseID, processedInput, toolUseContext, appState.toolPermissionContext.mode, toolUseContext.abortController.signal, undefined, toolUseContext.requestPrompt, tool.getToolUseSummary?.(processedInput))) {
            try {
                if (result.message) {
                    yield { type: 'message', message: { message: result.message as any } };
                }
                if (result.blockingError) {
                    const denialMessage = getBeforeToolInvokeHookBlockingMessage(`BeforeToolInvoke:${tool.name}`, result.blockingError);
                    yield {
                        type: 'hookPermissionResult',
                        hookPermissionResult: {
                            behavior: 'deny',
                            message: denialMessage,
                            decisionReason: {
                                type: 'hook',
                                hookName: `BeforeToolInvoke:${tool.name}`,
                                reason: denialMessage,
                            },
                        },
                    };
                }
                if (result.preventContinuation) {
                    yield {
                        type: 'preventContinuation',
                        shouldPreventContinuation: true,
                    };
                    if (result.stopReason) {
                        yield { type: 'stopReason', stopReason: result.stopReason };
                    }
                }
                if (result.permissionBehavior !== undefined) {
                    logForDebugging(`Hook result has permissionBehavior=${result.permissionBehavior}`);
                    const decisionReason: PermissionDecisionReason = {
                        type: 'hook',
                        hookName: `BeforeToolInvoke:${tool.name}`,
                        hookSource: result.hookSource,
                        reason: result.hookPermissionDecisionReason,
                    };
                    if (result.permissionBehavior === 'allow') {
                        yield {
                            type: 'hookPermissionResult',
                            hookPermissionResult: {
                                behavior: 'allow',
                                updatedInput: result.updatedInput,
                                decisionReason,
                            },
                        };
                    }
                    else if (result.permissionBehavior === 'ask') {
                        yield {
                            type: 'hookPermissionResult',
                            hookPermissionResult: {
                                behavior: 'ask',
                                updatedInput: result.updatedInput,
                                message: result.hookPermissionDecisionReason ||
                                    `Hook BeforeToolInvoke:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
                                decisionReason,
                            },
                        };
                    }
                    else {
                        yield {
                            type: 'hookPermissionResult',
                            hookPermissionResult: {
                                behavior: result.permissionBehavior,
                                message: result.hookPermissionDecisionReason ||
                                    `Hook BeforeToolInvoke:${tool.name} ${getRuleBehaviorDescription(result.permissionBehavior)} this tool`,
                                decisionReason,
                            },
                        };
                    }
                }
                if (result.updatedInput && result.permissionBehavior === undefined) {
                    yield {
                        type: 'hookUpdatedInput',
                        updatedInput: result.updatedInput,
                    };
                }
                if (result.additionalContexts && result.additionalContexts.length > 0) {
                    yield {
                        type: 'additionalContext',
                        message: {
                            message: createAttachmentMessage({
                                type: 'hook_additional_context',
                                content: result.additionalContexts,
                                hookName: `BeforeToolInvoke:${tool.name}`,
                                toolUseID,
                                hookEvent: 'BeforeToolInvoke',
                            }),
                        },
                    };
                }
                if (toolUseContext.abortController.signal.aborted) {
                    logEvent('open_code_cli_pre_tool_hooks_cancelled', {
                        toolName: sanitizeToolNameForAnalytics(tool.name),
                        queryChainId: toolUseContext.queryTracking
                            ?.chainId as AnalyticsScalarMetadata,
                        queryDepth: toolUseContext.queryTracking?.depth,
                    });
                    yield {
                        type: 'message',
                        message: {
                            message: createAttachmentMessage({
                                type: 'hook_cancelled',
                                hookName: `BeforeToolInvoke:${tool.name}`,
                                toolUseID,
                                hookEvent: 'BeforeToolInvoke',
                            }),
                        },
                    };
                    yield { type: 'stop' };
                    return;
                }
            }
            catch (error) {
                logError(error);
                const durationMs = Date.now() - hookStartTime;
                logEvent('open_code_cli_pre_tool_hook_error', {
                    messageID: messageId as AnalyticsScalarMetadata,
                    toolName: sanitizeToolNameForAnalytics(tool.name),
                    isMcp: tool.isMcp ?? false,
                    duration: durationMs,
                    queryChainId: toolUseContext.queryTracking
                        ?.chainId as AnalyticsScalarMetadata,
                    queryDepth: toolUseContext.queryTracking?.depth,
                    ...(mcpServerType
                        ? {
                            mcpServerType: mcpServerType as AnalyticsScalarMetadata,
                        }
                        : {}),
                    ...(requestId
                        ? {
                            requestId: requestId as AnalyticsScalarMetadata,
                        }
                        : {}),
                });
                yield {
                    type: 'message',
                    message: {
                        message: createAttachmentMessage({
                            type: 'hook_error_during_execution',
                            content: formatError(error),
                            hookName: `BeforeToolInvoke:${tool.name}`,
                            toolUseID: toolUseID,
                            hookEvent: 'BeforeToolInvoke',
                        }),
                    },
                };
                yield { type: 'stop' };
            }
        }
    }
    catch (error) {
        logError(error);
        yield { type: 'stop' };
        return;
    }
}
