import type { Message } from '../types/message.js'
export type SessionTurnUploader = (messages: Message[]) => void | Promise<void>
export function createSessionTurnUploader(): SessionTurnUploader {
  throw new Error('not implemented')
}
