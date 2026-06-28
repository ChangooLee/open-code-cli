/**
 * A content block carrying connector-provided text (feature: CONNECTOR_TEXT).
 */
export interface ConnectorTextBlock {
  type: 'connector_text'
  connector_text: string
  signature?: string
}

/**
 * A streaming delta for a {@link ConnectorTextBlock}.
 */
export interface ConnectorTextDelta {
  type: 'connector_text_delta'
  connector_text: string
}

/**
 * Type guard: whether an arbitrary value is a connector text block.
 */
export function isConnectorTextBlock(
  value: unknown,
): value is ConnectorTextBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'connector_text'
  )
}
