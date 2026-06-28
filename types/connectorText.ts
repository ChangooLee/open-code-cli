export interface ConnectorTextBlock {
  type: 'connector_text'
  connector_text: string
  signature?: string
}
export interface ConnectorTextDelta {
  type: 'connector_text_delta'
  connector_text: string
}
export function isConnectorTextBlock(
  value: unknown,
): value is ConnectorTextBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'connector_text'
  )
}
