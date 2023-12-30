import React from 'react';

import style from './Draft.module.css';

import { Card, cardsEqual } from 'common/game/card';
import { DraftStateInfo, draftStateCardLimits } from 'common/game/draft';
import { GameMetadata } from 'common/game/metadata';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';

import { Button } from 'client/components/common/button';
import { DeckList } from 'client/components/draft/DeckList';
import { ManaCurve } from 'client/components/draft/ManaCurve';
import { PoolComponent } from 'client/components/draft/PoolComponent';
import { RoundLabel } from 'client/components/draft/RoundLabel';
import { DraftSketch } from 'client/context/draft/draft_sketch';
import { DraftSketchManager } from 'client/context/draft/draft_sketch_manager';
import { doChooseDraftCardsAsync, doExitDraftAsync } from 'client/store/draft';
import { useLoRDispatch } from 'client/store/hooks';

export interface DraftProps {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
  draftState: DraftStateInfo;
  gameMetadata: GameMetadata | null;
}

export function DraftComponent(props: DraftProps) {
  const dispatch = useLoRDispatch();

  const [sketch, setSketch] = React.useState<DraftSketch>(
    new DraftSketch(props.draftState.deck)
  );

  const selected_cards = sketch.addedCards;
  const cards = props.draftState.pendingCards;

  const sketchManager = new DraftSketchManager(sketch, (sketch) => {
    setSketch(sketch);
  });

  React.useEffect(() => {
    setSketch(new DraftSketch(props.draftState.deck));

    // Reset the draft sketch whenever the deck changes. The deck can only
    // change by adding cards, so we can just monitor the number of cards in the
    // deck to monitor changes.
  }, [props.draftState.deck.numCards]);

  function exitDraft() {
    dispatch(
      doExitDraftAsync({
        socket: props.socket,
        authInfo: props.authInfo,
      })
    );
  }

  function confirm() {
    const revertedCards = selected_cards.map(
      (chosen_card) =>
        cards.find((card) => cardsEqual(card, chosen_card)) ??
        (undefined as never)
    );
    chooseCards(revertedCards);
  }

  async function chooseCards(revertedCards: Card[]) {
    const min_max = draftStateCardLimits(props.draftState.state);
    if (min_max === null) {
      return;
    }

    if (
      min_max[0] > revertedCards.length &&
      min_max[1] < revertedCards.length
    ) {
      return;
    }

    dispatch(
      doChooseDraftCardsAsync({
        socket: props.socket,
        authInfo: props.authInfo,
        cards: revertedCards,
      })
    );
  }

  return (
    <div>
      <div className={style.cardSelectLayout}>
        <PoolComponent
          socket={props.socket}
          authInfo={props.authInfo}
          draftState={props.draftState}
          draftSketchManager={sketchManager}
        />
        <div className={style.draftInformation}>
          <RoundLabel draftState={props.draftState} />
          <ManaCurve draftSketch={sketchManager.sketch()} />
          <div className={style.buttonContainer}>
            <Button onClick={confirm}>CONFIRM!</Button>
          </div>
        </div>
      </div>
      <div>
        <DeckList
          draftState={props.draftState}
          draftSketch={sketchManager.sketch()}
          gameMetadata={props.gameMetadata}
        />
      </div>
      <div>
        <Button onClick={exitDraft}>EXIT!</Button>
      </div>
    </div>
  );
}
