import { SessionAuthInfo } from 'server/auth'
import { ServerDraftState } from 'server/draft_state'

export interface SessionInfo {
  auth_info: SessionAuthInfo
  draft_state?: ServerDraftState
}
