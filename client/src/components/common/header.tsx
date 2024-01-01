import { Box, Grid } from '@mui/material';
import React from 'react';

import style from './header.module.css';

import { LoRDraftClientSocket } from 'common/game/socket-msgs';

import { UserComponent } from 'client/components/auth/UserInfoComponent';
import { ModeSelection } from 'client/components/draft/ModeSelection';
import { useLoRSelector } from 'client/store/hooks';
import { isSignedIn, selectSessionState } from 'client/store/session';
import { APP_TITLE } from 'client/utils/constants';

export function Header(props: { socket: LoRDraftClientSocket }) {
  const session_state = useLoRSelector(selectSessionState);

  return (
    <div className={style.header}>
      <Grid container spacing={2} alignItems='center'>
        <Grid item xs={3}>
          <ModeSelection />
        </Grid>
        <Grid item xs={6}>
          <Box display='flex' justifyContent='center' fontWeight='bold'>
            {APP_TITLE}
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box display='flex' justifyContent='right'>
            {isSignedIn(session_state) ? (
              <UserComponent
                socket={props.socket}
                authInfo={session_state.authInfo}
              />
            ) : null}
          </Box>
        </Grid>
      </Grid>
    </div>
  );
}
