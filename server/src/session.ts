import { SessionAuthInfo } from 'auth'
import { ServerDraftStateInfo } from 'draft_state'

export interface SessionInfo {
  auth_info: SessionAuthInfo
  draft_state_info?: ServerDraftStateInfo
}
