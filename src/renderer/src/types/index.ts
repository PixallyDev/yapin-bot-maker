import { Node, Edge } from '@xyflow/react'

export interface OnMessageData extends Record<string, unknown> {
  label: string
  ignoreBots: boolean
}

export interface OnCommandData extends Record<string, unknown> {
  label: string
  commandName: string
  description: string
}

export interface TextConditionData extends Record<string, unknown> {
  label: string
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with'
  value: string
  caseSensitive: boolean
}

export interface CheckUserRoleData extends Record<string, unknown> {
  label: string
  checkType: 'username' | 'user_id' | 'is_bot'
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
}

export interface CooldownTimerData extends Record<string, unknown> {
  label: string
  seconds: number
  scope: 'user' | 'channel' | 'global'
}

export interface SetVariableData extends Record<string, unknown> {
  label: string
  varName: string
  value: string
  operation: 'set' | 'increment' | 'decrement'
}

export interface GetVariableData extends Record<string, unknown> {
  label: string
  varName: string
  fallback?: string
}

export interface SendReplyData extends Record<string, unknown> {
  label: string
  message: string
}

export interface SendRichMessageData extends Record<string, unknown> {
  label: string
  title: string
  description: string
  color: string
  footer?: string
  imageUrl?: string
}

export interface RandomReplyData extends Record<string, unknown> {
  label: string
  replies: string
}

export interface WaitDelayData extends Record<string, unknown> {
  label: string
  seconds: number
}

export interface ModerateMessageData extends Record<string, unknown> {
  label: string
  actionType: 'delete' | 'timeout' | 'kick'
  minutes?: number
  reason?: string
}

export interface LogConsoleData extends Record<string, unknown> {
  label: string
  message: string
  level: 'info' | 'warn' | 'error' | 'success'
}

export type CustomNodeData =
  | OnMessageData
  | OnCommandData
  | TextConditionData
  | CheckUserRoleData
  | CooldownTimerData
  | SetVariableData
  | GetVariableData
  | SendReplyData
  | SendRichMessageData
  | RandomReplyData
  | WaitDelayData
  | ModerateMessageData
  | LogConsoleData

export type BotNode = Node<CustomNodeData>
export type BotEdge = Edge

export interface PaletteItem {
  type:
    | 'onMessage'
    | 'onCommand'
    | 'textCondition'
    | 'checkUserRole'
    | 'cooldownTimer'
    | 'setVariable'
    | 'getVariable'
    | 'sendReply'
    | 'sendRichMessage'
    | 'randomReply'
    | 'waitDelay'
    | 'moderateMessage'
    | 'logConsole'
  category: 'trigger' | 'condition' | 'variable' | 'action'
  title: string
  description: string
  icon: string
  defaultData: CustomNodeData
}

export interface BotLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}
