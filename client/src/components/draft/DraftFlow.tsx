import React from 'react';

import { DraftOptions, defaultDraftOptions } from 'common/game/draft_options';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';

import { Header } from 'client/components/common/header';
import { DraftComponent } from 'client/components/draft/Draft';
import SettingsMenu from 'client/components/draft/SettingsMenu';
import {
  doExitDraftAsync,
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
  const [options, setOptions] =
    React.useState<DraftOptions>(defaultDraftOptions);
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
    const rejoinDraft = async () => {
      await dispatch(
        doExitDraftAsync({
          socket: props.socket,
          authInfo: props.authInfo,
        })
      );
      await dispatch(
        doJoinDraftAsync({
          socket: props.socket,
          authInfo: props.authInfo,
          draftOptions: options,
        })
      );
    };

    if (inDraft(draft_state)) {
      rejoinDraft();
    }
  }, [options.draftFormat, options.rarityRestriction]);

  if (!inDraft(draft_state)) {
    return <></>;
  } else {
    return (
      <>
        <Header
          socket={props.socket}
          leftComponent={
            <SettingsMenu
              setOptions={setOptions}
              deck={draft_state.state.deck}
            />
          }
        />
        <DraftComponent
          socket={props.socket}
          authInfo={props.authInfo}
          draftState={draft_state.state}
          gameMetadata={game_metadata}
          setOptions={setOptions}
        />
      </>
    );
  }
}
