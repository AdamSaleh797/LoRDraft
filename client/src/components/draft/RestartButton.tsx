import React from 'react';

import { DraftStateInfo } from 'common/game/draft';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';

import { Button } from 'client/components/common/button';
import ChangeWarning from 'client/components/draft/ChangeWarning';
import { doExitDraftAsync, doJoinDraftAsync } from 'client/store/draft';
import { useLoRDispatch } from 'client/store/hooks';

interface RestartButtonProps {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
  draftState: DraftStateInfo;
}

export function RestartButton(props: RestartButtonProps) {
  const dispatch = useLoRDispatch();

  const [warning, setWarning] = React.useState(false);

  const openWarning = () => {
    setWarning(true);
  };
  const closeWarning = () => {
    setWarning(false);
  };

  async function restartDraft() {
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
        draftOptions: props.draftState.deck.options,
      })
    );
  }

  return (
    <div>
      <Button onClick={openWarning}>Restart</Button>
      <ChangeWarning
        flavorText='Are you sure you want to restart the draft?'
        open={warning}
        accept={() => {
          closeWarning();
          restartDraft();
        }}
        decline={closeWarning}
      />
    </div>
  );
}
