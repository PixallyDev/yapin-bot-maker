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

export interface SendReplyData extends Record<string, unknown> {
  label: string
  message: string
}

export interface LogConsoleData extends Record<string, unknown> {
  label: string
  message: string
  level: 'info' | 'warn' | 'error' | 'success'
}

export type CustomNodeData =
  OnMessageData | OnCommandData | TextConditionData | SendReplyData | LogConsoleData

export type BotNode = Node<CustomNodeData>
export type BotEdge = Edge

export interface PaletteItem {
  type: 'onMessage' | 'onCommand' | 'textCondition' | 'sendReply' | 'logConsole'
  category: 'trigger' | 'condition' | 'action'
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
