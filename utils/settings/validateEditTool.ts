import type { ValidationResult } from 'src/Tool.js'
import { isOpenCodeCliSettingsPath } from '../permissions/filesystem.js'
import { validateSettingsFileContent } from './validation.js'
export function validateInputForSettingsFileEdit(
  filePath: string,
  originalContent: string,
  getUpdatedContent: () => string,
): Extract<ValidationResult, { result: false }> | null {
  if (!isOpenCodeCliSettingsPath(filePath)) {
    return null
  }
  const beforeValidation = validateSettingsFileContent(originalContent)
  if (!beforeValidation.isValid) {
    return null
  }
  const updatedContent = getUpdatedContent()
  const afterValidation = validateSettingsFileContent(updatedContent)
  if (!afterValidation.isValid) {
    return {
      result: false,
      message: `Open Code CLI settings.json validation failed after edit:\n${afterValidation.error}\n\nFull schema:\n${afterValidation.fullSchema}\nIMPORTANT: Do not update the env unless explicitly instructed to do so.`,
      errorCode: 10,
    }
  }
  return null
}
