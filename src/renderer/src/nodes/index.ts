import { NodeTypes } from '@xyflow/react'
import { NODE_CATALOG } from '../data/nodeCatalog'
import { CatalogNode } from './CatalogNode'
import { OnMessageNode } from './OnMessageNode'
import { OnCommandNode } from './OnCommandNode'
import { TextConditionNode } from './TextConditionNode'
import { CheckUserRoleNode } from './CheckUserRoleNode'
import { CooldownTimerNode } from './CooldownTimerNode'
import { SetVariableNode } from './SetVariableNode'
import { GetVariableNode } from './GetVariableNode'
import { SendReplyNode } from './SendReplyNode'
import { SendRichMessageNode } from './SendRichMessageNode'
import { RandomReplyNode } from './RandomReplyNode'
import { WaitDelayNode } from './WaitDelayNode'
import { ModerateMessageNode } from './ModerateMessageNode'
import { LogConsoleNode } from './LogConsoleNode'
import { JavascriptCodeNode } from './JavascriptCodeNode'

export const nodeTypes: NodeTypes = {
  ...Object.fromEntries(NODE_CATALOG.map((entry) => [entry.type, CatalogNode])),
  onMessage: OnMessageNode,
  onCommand: OnCommandNode,
  textCondition: TextConditionNode,
  checkUserRole: CheckUserRoleNode,
  cooldownTimer: CooldownTimerNode,
  setVariable: SetVariableNode,
  getVariable: GetVariableNode,
  sendReply: SendReplyNode,
  sendRichMessage: SendRichMessageNode,
  randomReply: RandomReplyNode,
  waitDelay: WaitDelayNode,
  moderateMessage: ModerateMessageNode,
  logConsole: LogConsoleNode,
  javascriptCode: JavascriptCodeNode
}

export {
  OnMessageNode,
  OnCommandNode,
  TextConditionNode,
  CheckUserRoleNode,
  CooldownTimerNode,
  SetVariableNode,
  GetVariableNode,
  SendReplyNode,
  SendRichMessageNode,
  RandomReplyNode,
  WaitDelayNode,
  ModerateMessageNode,
  LogConsoleNode,
  JavascriptCodeNode
}
