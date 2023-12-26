import React from 'react'

import style from './RoundLabel.module.css'

import {
  DraftDeck,
  DraftState,
  DraftStateInfo,
  RANDOM_SELECTION_1_CARD_CUTOFF,
  RANDOM_SELECTION_2_CARD_CUTOFF,
  RANDOM_SELECTION_3_CARD_CUTOFF,
} from 'common/game/draft'

interface NonChampRoundLabelProps {
  state:
    | DraftState.RANDOM_SELECTION_1
    | DraftState.RANDOM_SELECTION_2
    | DraftState.RANDOM_SELECTION_3
  deck: DraftDeck
}

function NonChampRoundLabel(props: NonChampRoundLabelProps) {
  switch (props.state) {
    case DraftState.RANDOM_SELECTION_1:
      return (
        <div className={style.roundLabelContainer}>
          <div className={style.roundLabel}>
            <div>
              NEXT CHAMP ROUND IN:{' '}
              {RANDOM_SELECTION_1_CARD_CUTOFF - props.deck.numCards}
            </div>
            <div className={style.bottomText}>select one</div>
          </div>
        </div>
      )
    case DraftState.RANDOM_SELECTION_2:
      return (
        <div className={style.roundLabelContainer}>
          <div className={style.roundLabel}>
            <div>
              NEXT CHAMP ROUND IN:{' '}
              {RANDOM_SELECTION_2_CARD_CUTOFF - props.deck.numCards}
            </div>
            <div className={style.bottomText}>select one</div>
          </div>
        </div>
      )
    case DraftState.RANDOM_SELECTION_3:
      return (
        <div className={style.roundLabelContainer}>
          <div className={style.roundLabel}>
            <div>
              NEXT CHAMP ROUND IN:{' '}
              {RANDOM_SELECTION_3_CARD_CUTOFF - props.deck.numCards}
            </div>
            <div className={style.bottomText}>select one</div>
          </div>
        </div>
      )
  }
}

export interface RoundLabelProps {
  draftState: DraftStateInfo
}

export function RoundLabel(props: RoundLabelProps) {
  switch (props.draftState.state) {
    case DraftState.INITIAL_SELECTION:
      return (
        <div className={style.roundLabelContainer}>
          <div className={style.roundLabel}>
            <div>CHAMPION ROUND</div>
            <div className={style.bottomText}>select two</div>
          </div>
        </div>
      )
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2:
    case DraftState.CHAMP_ROUND_3:
      return (
        <div className={style.roundLabelContainer}>
          <div className={style.roundLabel}>
            <div>CHAMPION ROUND</div>
            <div className={style.bottomText}>select up to two</div>
          </div>
        </div>
      )
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3:
      return (
        <NonChampRoundLabel
          state={props.draftState.state}
          deck={props.draftState.deck}
        />
      )
    case DraftState.GENERATE_CODE:
    case DraftState.INIT:
      return <div></div>
  }
}
