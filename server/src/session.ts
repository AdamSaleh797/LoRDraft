import { DraftStateInfo } from 'common/game/draft'

import { SessionAuthInfo } from 'server/auth'

export interface SessionInfo {
  authInfo: SessionAuthInfo
  draftState?: DraftStateInfo
}
