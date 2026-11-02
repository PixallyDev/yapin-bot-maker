import { NodeTypes } from '@xyflow/react'
import { OnMessageNode } from './OnMessageNode'
import { OnCommandNode } from './OnCommandNode'
import { TextConditionNode } from './TextConditionNode'
import { SendReplyNode } from './SendReplyNode'
import { LogConsoleNode } from './LogConsoleNode'

export const nodeTypes: NodeTypes = {
  onMessage: OnMessageNode,
  onCommand: OnCommandNode,
  textCondition: TextConditionNode,
  sendReply: SendReplyNode,
  logConsole: LogConsoleNode
}

export { OnMessageNode, OnCommandNode, TextConditionNode, SendReplyNode, LogConsoleNode }
