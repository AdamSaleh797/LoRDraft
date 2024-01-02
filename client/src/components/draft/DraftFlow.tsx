import React from 'react';

import { DraftRarityRestriction } from 'common/game/draft_options';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';

import { DraftComponent } from 'client/components/draft/Draft';
import {
  doJoinDraftAsync,
  inDraft,
  selectDraftState,
} from 'client/store/draft';
import {
  doFetchGameMetadataAsync,
  selectGameMetadataState,
} from 'client/store/game_metadata';
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks';

interface DraftFlowComponentProps {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
}

export function DraftFlowComponent(props: DraftFlowComponentProps) {
  const draft_state = useLoRSelector(selectDraftState);
  const game_metadata = useLoRSelector(selectGameMetadataState);
  const dispatch = useLoRDispatch();

  if (game_metadata === null) {
    setTimeout(() => {
      dispatch(
        doFetchGameMetadataAsync({
          socket: props.socket,
          authInfo: props.authInfo,
        })
      );
    }, 0);
  }

  React.useEffect(() => {
    const draft_options = {
      draftFormat: 'Eternal' as const,
      rarityRestriction: DraftRarityRestriction.ANY_RARITY,
    };

    dispatch(
      doJoinDraftAsync({
        socket: props.socket,
        authInfo: props.authInfo,
        draftOptions: draft_options,
      })
    );
  }, []);

  if (!inDraft(draft_state)) {
    return <></>;
  } else {
    return (
      <DraftComponent
        socket={props.socket}
        authInfo={props.authInfo}
        draftState={draft_state.state}
        gameMetadata={game_metadata}
      />
    );
  }
}
