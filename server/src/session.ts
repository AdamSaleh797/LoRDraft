import { DraftStateInfo } from 'common/game/draft'

import { SessionAuthInfo } from 'server/store/usermap'

export interface SessionInfo {
  readonly username: string
  readonly authInfo: SessionAuthInfo
  draftState?: DraftStateInfo
}
