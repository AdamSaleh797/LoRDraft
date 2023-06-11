import { DraftStateInfo } from 'common/game/draft'

import { SessionAuthInfo } from 'server/auth'

export interface SessionInfo {
  auth_info: SessionAuthInfo
  draft_state?: DraftStateInfo
}
