import React from 'react';

import style from './RoundLabel.module.css';

import {
  DraftDeck,
  DraftState,
  DraftStateInfo,
  RANDOM_SELECTION_1_CARD_CUTOFF,
  RANDOM_SELECTION_2_CARD_CUTOFF,
  RANDOM_SELECTION_3_CARD_CUTOFF,
} from 'common/game/draft';
import { DraftRarityRestriction } from 'common/game/draft_options';

interface NonChampRoundLabelProps {
  state:
    | DraftState.RANDOM_SELECTION_1
    | DraftState.RANDOM_SELECTION_2
    | DraftState.RANDOM_SELECTION_3;
  deck: DraftDeck;
}

function NonChampRoundLabel(props: NonChampRoundLabelProps) {
  let cutoff;
  switch (props.state) {
    case DraftState.RANDOM_SELECTION_1:
      cutoff = RANDOM_SELECTION_1_CARD_CUTOFF;
      break;
    case DraftState.RANDOM_SELECTION_2:
      cutoff = RANDOM_SELECTION_2_CARD_CUTOFF;
      break;
    case DraftState.RANDOM_SELECTION_3:
      cutoff = RANDOM_SELECTION_3_CARD_CUTOFF;
      break;
  }
  return (
    <>
      <div>Next Champion Round In: {cutoff - props.deck.numCards}</div>
      <div className={style.bottomText}>Select One</div>
    </>
  );
}

export interface RoundLabelProps {
  draftState: DraftStateInfo;
}

export function RoundLabel(props: RoundLabelProps) {
  let contents;
  if (
    props.draftState.deck.options.rarityRestriction ===
    DraftRarityRestriction.ANY_RARITY
  ) {
    switch (props.draftState.state) {
      case DraftState.INITIAL_SELECTION:
        contents = (
          <>
            <div>Champion Round</div>
            <div className={style.bottomText}>Select Two</div>
          </>
        );
        break;
      case DraftState.CHAMP_ROUND_1:
      case DraftState.CHAMP_ROUND_2:
      case DraftState.CHAMP_ROUND_3:
        contents = (
          <>
            <div>Champion Round</div>
            <div className={style.bottomText}>Select Up To Two</div>
          </>
        );
        break;
      case DraftState.RANDOM_SELECTION_1:
      case DraftState.RANDOM_SELECTION_2:
      case DraftState.RANDOM_SELECTION_3:
        contents = (
          <NonChampRoundLabel
            state={props.draftState.state}
            deck={props.draftState.deck}
          />
        );
        break;
      case DraftState.GENERATE_CODE:
        contents = (
          <>
            <div>Draft Completed!</div>
            <div className={style.bottomText}>Copy Your Deck Code!</div>
          </>
        );
        break;
      case DraftState.INIT:
        contents = <></>;
        break;
    }
  } else {
    if (props.draftState.state === DraftState.GENERATE_CODE) {
      contents = (
        <>
          <div>Draft Completed!</div>
          <div className={style.bottomText}>Copy Your Deck Code!</div>
        </>
      );
    } else {
      contents = (
        <>
          <div>Rounds Left: {43 - props.draftState.deck.numCards} </div>
          <div className={style.bottomText}>Select One</div>
        </>
      );
    }
  }
  return (
    <div className={style.roundLabelContainer}>
      <div className={style.roundLabel}>{contents}</div>
    </div>
  );
}
