import type { ContentBlockParam } from 'src/services/api/chatCompletions.js';
import type { Command } from '../commands.js';
import { AGENT_TOOL_NAME } from '../tools/AgentTool/constants.js';
const promptBarCommand = {
    type: 'prompt',
    description: "Set up Open Code CLI's prompt bar UI",
    contentLength: 0,
    aliases: [],
    name: 'prompt-bar',
    progressMessage: 'setting up promptBar',
    allowedTools: [AGENT_TOOL_NAME, 'Read(~/**)', 'Edit(~/.open-code-cli/settings.json)'],
    source: 'builtin',
    disableNonInteractive: true,
    async getPromptForCommand(args): Promise<ContentBlockParam[]> {
        const prompt = args.trim() || 'Configure my promptBar from my shell PS1 configuration';
        return [{
                type: 'text',
                text: `Create an ${AGENT_TOOL_NAME} with subagent_type "prompt-bar-setup" and the prompt "${prompt}"`
            }];
    }
} satisfies Command;
export default promptBarCommand;
