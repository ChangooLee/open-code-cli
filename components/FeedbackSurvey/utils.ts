/**
 * A user's response to a feedback survey prompt.
 */
export type FeedbackSurveyResponse = 'dismissed' | 'bad' | 'fine' | 'good'

/**
 * Which kind of feedback survey is being shown.
 *
 * NOTE: only 'session' is observed at call sites; the other members are
 * reasonable guesses for the survey variants in this directory.
 */
export type FeedbackSurveyType = 'session' | 'post_compact' | 'memory'
