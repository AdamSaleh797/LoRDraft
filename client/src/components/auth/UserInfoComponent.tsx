import { Box } from '@mui/material';
import React from 'react';

import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';

import { Button } from 'client/components/common/button';
import { useLoRDispatch } from 'client/store/hooks';
import { logoutUser } from 'client/store/session';

interface UserComponentProps {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
}

export function UserComponent(props: UserComponentProps) {
  const dispatch = useLoRDispatch();

  return (
    <Box display='flex' justifyContent='center' alignContent='center'>
      <Button
        onClick={() => {
          logoutUser(dispatch, {
            socket: props.socket,
            authInfo: props.authInfo,
          });
        }}
      >
        Log out
      </Button>
    </Box>
  );
}
