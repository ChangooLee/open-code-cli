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
