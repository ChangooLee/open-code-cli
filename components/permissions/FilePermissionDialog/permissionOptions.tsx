import { homedir } from 'os';
import { basename, join, sep } from 'path';
import React, { type ReactNode } from 'react';
import { getOriginalCwd } from '../../../bootstrap/state.js';
import { Text } from '../../../ink.js';
import { getShortcutDisplay } from '../../../keybindings/shortcutFormat.js';
import type { ToolPermissionContext } from '../../../Tool.js';
import { expandPath, getDirectoryForPath } from '../../../utils/path.js';
import { normalizeCaseForComparison, pathInAllowedWorkingPath } from '../../../utils/permissions/filesystem.js';
import type { OptionWithDescription } from '../../CustomSelect/select.js';
export function isInOpenCodeCliFolder(filePath: string): boolean {
  const absolutePath = expandPath(filePath);
  const openCodeCliFolderPath = expandPath(`${getOriginalCwd()}/.open-code-cli`);
  const normalizedAbsolutePath = normalizeCaseForComparison(absolutePath);
  const normalizedOpenCodeCliFolderPath = normalizeCaseForComparison(openCodeCliFolderPath);
  return normalizedAbsolutePath.startsWith(normalizedOpenCodeCliFolderPath + sep.toLowerCase()) ||
  normalizedAbsolutePath.startsWith(normalizedOpenCodeCliFolderPath + '/');
}
export function isInGlobalOpenCodeCliFolder(filePath: string): boolean {
  const absolutePath = expandPath(filePath);
  const globalOpenCodeCliFolderPath = join(homedir(), '.open-code-cli');
  const normalizedAbsolutePath = normalizeCaseForComparison(absolutePath);
  const normalizedGlobalOpenCodeCliFolderPath = normalizeCaseForComparison(globalOpenCodeCliFolderPath);
  return normalizedAbsolutePath.startsWith(normalizedGlobalOpenCodeCliFolderPath + sep.toLowerCase()) || normalizedAbsolutePath.startsWith(normalizedGlobalOpenCodeCliFolderPath + '/');
}
export type PermissionOption = {
  type: 'accept-once';
} | {
  type: 'accept-session';
  scope?: 'open-code-cli-folder' | 'global-open-code-cli-folder';
} | {
  type: 'reject';
};
export type PermissionOptionWithLabel = OptionWithDescription<string> & {
  option: PermissionOption;
};
export type FileOperationType = 'read' | 'write' | 'create';
export function getFilePermissionOptions({
  filePath,
  toolPermissionContext,
  operationType = 'write',
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false
}: {
  filePath: string;
  toolPermissionContext: ToolPermissionContext;
  operationType?: FileOperationType;
  onRejectFeedbackChange?: (value: string) => void;
  onAcceptFeedbackChange?: (value: string) => void;
  yesInputMode?: boolean;
  noInputMode?: boolean;
}): PermissionOptionWithLabel[] {
  const options: PermissionOptionWithLabel[] = [];
  const modeCycleShortcut = getShortcutDisplay('chat:cycleMode', 'Chat', 'shift+tab');
  if (yesInputMode && onAcceptFeedbackChange) {
    options.push({
      type: 'input',
      label: 'Yes',
      value: 'yes',
      placeholder: 'and tell Open Code CLI what to do next',
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: true,
      option: {
        type: 'accept-once'
      }
    });
  } else {
    options.push({
      label: 'Yes',
      value: 'yes',
      option: {
        type: 'accept-once'
      }
    });
  }
  const inAllowedPath = pathInAllowedWorkingPath(filePath, toolPermissionContext);
  const inOpenCodeCliFolder = isInOpenCodeCliFolder(filePath);
  const inGlobalOpenCodeCliFolder = isInGlobalOpenCodeCliFolder(filePath);
  if ((inOpenCodeCliFolder || inGlobalOpenCodeCliFolder) && operationType !== 'read') {
    options.push({
      label: 'Yes, and allow Open Code CLI to edit its own settings for this session',
      value: 'yes-open-code-cli-folder',
      option: {
        type: 'accept-session',
        scope: inGlobalOpenCodeCliFolder ? 'global-open-code-cli-folder' : 'open-code-cli-folder'
      }
    });
  } else {
    let sessionLabel: ReactNode;
    if (inAllowedPath) {
      if (operationType === 'read') {
        sessionLabel = 'Yes, during this session';
      } else {
        sessionLabel = <Text>
            Yes, allow all edits during this session{' '}
            <Text bold>({modeCycleShortcut})</Text>
          </Text>;
      }
    } else {
      const dirPath = getDirectoryForPath(filePath);
      const dirName = basename(dirPath) || 'this directory';
      if (operationType === 'read') {
        sessionLabel = <Text>
            Yes, allow reading from <Text bold>{dirName}/</Text> during this
            session
          </Text>;
      } else {
        sessionLabel = <Text>
            Yes, allow all edits in <Text bold>{dirName}/</Text> during this
            session <Text bold>({modeCycleShortcut})</Text>
          </Text>;
      }
    }
    options.push({
      label: sessionLabel,
      value: 'yes-session',
      option: {
        type: 'accept-session'
      }
    });
  }
  if (noInputMode && onRejectFeedbackChange) {
    options.push({
      type: 'input',
      label: 'No',
      value: 'no',
      placeholder: 'and tell Open Code CLI what to do differently',
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: true,
      option: {
        type: 'reject'
      }
    });
  } else {
    options.push({
      label: 'No',
      value: 'no',
      option: {
        type: 'reject'
      }
    });
  }
  return options;
}
