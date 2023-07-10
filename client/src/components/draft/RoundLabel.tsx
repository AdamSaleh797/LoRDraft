import React from 'react'

import style from './RoundLabel.module.css'

import { DraftState, DraftStateInfo } from 'common/game/draft'

export interface RoundLabelComponentProps {
  draftState: DraftStateInfo
}

export function RoundLabel(props: RoundLabelComponentProps) {
  if (
    props.draftState.state.includes('CHAMP_ROUND') ||
    props.draftState.state === DraftState.INITIAL_SELECTION
  ) {
    return (
      <div className={style.roundLabelContainer}>
        <div className={style.roundLabel}>
          CHAMPION ROUND<br></br>SELECT TWO
        </div>
      </div>
    )
  } else {
    return (
      <div className={style.roundLabelContainer}>
        <div className={style.roundLabel}>SELECT ONE</div>
      </div>
    )
  }
}
