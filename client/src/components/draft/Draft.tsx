import React from 'react'

import style from './Draft.module.css'

import { DraftStateInfo } from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'

import { DeckList } from 'client/components/draft/DeckList'
import { ManaCurve } from 'client/components/draft/ManaCurve'
import { PoolComponent } from 'client/components/draft/PoolComponent'
import { TypeCounts } from 'client/components/draft/TypeCounts'

export interface DraftProps {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
  draftState: DraftStateInfo
  gameMetadata: GameMetadata | null
}

export function DraftComponent(props: DraftProps) {
  return (
    <div>
      <PoolComponent
        socket={props.socket}
        authInfo={props.authInfo}
        draftState={props.draftState}
      />
      <div className={style.deckInfoDisplay}>
        <ManaCurve draftState={props.draftState} />
      </div>
      <div className={style.deckInfoDisplay}>
        <TypeCounts draftState={props.draftState} />
      </div>
      <div>
        <DeckList
          draftState={props.draftState}
          gameMetadata={props.gameMetadata}
        />
      </div>
    </div>
  )
}
