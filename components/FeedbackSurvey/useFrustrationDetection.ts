import type { Message } from '../../types/message.js'
import type { TranscriptShareResponse } from './TranscriptSharePrompt.js'

type FrustrationSurveyState =
  | 'closed'
  | 'open'
  | 'thanks'
  | 'transcript_prompt'
  | 'submitting'
  | 'submitted'

export interface FrustrationDetectionResult {
  state: FrustrationSurveyState
  handleTranscriptSelect: (selected: TranscriptShareResponse) => void
}

/**
 * Detects user frustration and surfaces a feedback survey.
 *
 * NOTE: full detection behavior is not reconstructed; this returns a closed
 * survey state. The real implementation is only loaded in ant builds.
 */
export function useFrustrationDetection(
  _messages: Message[],
  _isLoading: boolean,
  _hasActivePrompt: boolean,
  _suppressed: boolean,
): FrustrationDetectionResult {
  return {
    state: 'closed',
    handleTranscriptSelect: () => {},
  }
}
