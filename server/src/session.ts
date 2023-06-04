import { SessionAuthInfo } from 'auth'
import { ServerDraftState } from 'draft_state'

export interface SessionInfo {
  auth_info: SessionAuthInfo
  draft_state?: ServerDraftState
}
