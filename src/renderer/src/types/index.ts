import { Node, Edge } from '@xyflow/react'

export interface OnMessageData extends Record<string, unknown> {
  label: string
  ignoreBots: boolean
  userId?: string
  channelId?: string
  serverId?: string
  saveToVariable?: boolean
  variableName?: string
  variableScope?: 'local' | 'global'
}

export interface OnCommandData extends Record<string, unknown> {
  label: string
  commandName: string
  description: string
  prefix?: string
  commandPrefix?: string
  userId?: string
  channelId?: string
  serverId?: string
  saveToVariable?: boolean
  variableName?: string
  variableScope?: 'local' | 'global'
}

export interface TextConditionData extends Record<string, unknown> {
  label: string
  comparisonType?: 'text' | 'number' | 'user_role' | 'variable'
  operator: string
  value: string
  caseSensitive?: boolean
  leftValue?: string
  checkType?: 'username' | 'user_id' | 'is_bot'
  varName?: string
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
  scope?: 'local' | 'global'
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

export interface JavascriptCodeData extends Record<string, unknown> {
  label: string
  code: string
  outputCount?: number
  saveToVariable?: boolean
  variableName?: string
  variableScope?: 'local' | 'global'
}

export type CustomNodeData =
  | (Record<string, unknown> & { label: string })
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
  | JavascriptCodeData

export type BotNode = Node<CustomNodeData>
export type BotEdge = Edge

export interface PaletteItem {
  type: string
  category: string
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
