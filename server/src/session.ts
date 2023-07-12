import { DraftStateInfo } from 'common/game/draft'

import { SessionAuthInfo } from 'server/store/usermap'

export interface SessionInfo {
  authInfo: SessionAuthInfo
  draftState?: DraftStateInfo
}
