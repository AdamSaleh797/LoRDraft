import { ThemeProvider } from '@emotion/react';
import { createTheme } from '@mui/material';
import React from 'react';

import style from './App.module.css';

import SignIn from 'client/components/auth/NewSignInComponent';
import { UserComponent } from 'client/components/auth/UserInfoComponent';
import { Header } from 'client/components/common/header';
import { Layout } from 'client/components/common/layout';
import { DraftFlowComponent } from 'client/components/draft/DraftFlow';
import { useLoRDispatch, useLoRSelector } from 'client/store/hooks';
import {
  isSignedIn,
  selectSessionState,
  shouldInitialize,
  tryInitializeUserSession,
} from 'client/store/session';
import { createLoRSocket } from 'client/utils/network';

const theme = createTheme({
  palette: {
    primary: {
      light: '#757ce8',
      main: '#4066ba',
      dark: '#002884',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff7961',
      main: '#f44336',
      dark: '#ba000d',
      contrastText: '#000',
    },
    // error?: PaletteColorOptions;
    // warning?: PaletteColorOptions;
    // info?: PaletteColorOptions;
    // success?: PaletteColorOptions;
    // mode?: PaletteMode;
    // tonalOffset?: PaletteTonalOffset;
    // contrastThreshold?: number;
    // common?: Partial<CommonColors>;
    // grey?: ColorPartial;
    // text?: Partial<TypeText>;
    // divider?: string;
    // action?: Partial<TypeAction>;
    // background?: Partial<TypeBackground>;
  },
});

export default function App() {
  const session_state = useLoRSelector(selectSessionState);

  const socket_ref = React.useRef(createLoRSocket());
  const dispatch = useLoRDispatch();

  // If the session state has not initialized, then trigger the initialization
  if (shouldInitialize(session_state)) {
    tryInitializeUserSession(dispatch, {
      socket: socket_ref.current,
      cachedAuthInfo: session_state.cachedAuthInfo,
    });
  }

  return (
    <div className={style.App}>
      <ThemeProvider theme={theme}>
        <Header>
          {isSignedIn(session_state) ? (
            <UserComponent
              socket={socket_ref.current}
              authInfo={session_state.authInfo}
            />
          ) : null}
        </Header>
        <Layout>
          {isSignedIn(session_state) ? (
            <DraftFlowComponent
              socket={socket_ref.current}
              authInfo={session_state.authInfo}
            ></DraftFlowComponent>
          ) : (
            <SignIn socket={socket_ref.current} />
          )}
        </Layout>
      </ThemeProvider>
    </div>
  );
}
