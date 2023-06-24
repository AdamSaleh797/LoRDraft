import React from 'react'

import style from './Draft.module.css'

import { DraftStateInfo } from 'common/game/draft'
import { GameMetadata } from 'common/game/metadata'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'

import { DeckList } from 'client/components/draft/DeckList'
import { ManaCurve } from 'client/components/draft/ManaCurve'
import { PoolComponent } from 'client/components/draft/PoolComponent'
import { DraftSketch } from 'client/context/draft/draft_sketch'
import { DraftSketchManager } from 'client/context/draft/draft_sketch_manager'

export interface DraftProps {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
  draftState: DraftStateInfo
  gameMetadata: GameMetadata | null
}

export function DraftComponent(props: DraftProps) {
  const [sketch, setSketch] = React.useState<DraftSketch>(
    new DraftSketch(props.draftState.deck)
  )

  const sketchManager = new DraftSketchManager(sketch, (sketch) => {
    setSketch(sketch)
  })

  React.useEffect(() => {
    setSketch(new DraftSketch(props.draftState.deck))
  }, [props.draftState.deck.numCards])

  return (
    <div>
      <PoolComponent
        socket={props.socket}
        authInfo={props.authInfo}
        draftState={props.draftState}
        draftSketchManager={sketchManager}
      />
      <div className={style.deckInfoDisplay}>
        <ManaCurve draftSketch={sketchManager.sketch()} />
      </div>
      {/* <div className={style.deckInfoDisplay}>
        <TypeCounts draftSketch={sketchManager.sketch()} />
      </div> */}
      <div>
        <DeckList
          draftState={props.draftState}
          draftSketch={sketchManager.sketch()}
          gameMetadata={props.gameMetadata}
        />
      </div>
    </div>
  )
}
