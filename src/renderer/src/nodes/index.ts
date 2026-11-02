import { NodeTypes } from '@xyflow/react'
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

export const nodeTypes: NodeTypes = {
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
  logConsole: LogConsoleNode
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
  LogConsoleNode
}
