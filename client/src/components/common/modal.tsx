import React from 'react';

import SignIn from '../auth/NewSignInComponent';
import style from './modal.module.css';

import { LoRDraftClientSocket } from 'common/game/socket-msgs';

import { UserComponent } from 'client/components/auth/UserInfoComponent';
import { useLoRSelector } from 'client/store/hooks';
import { isSignedIn, selectSessionState } from 'client/store/session';

export interface ModalProps {
  setOpenModal: (b: boolean) => void;
  socket: LoRDraftClientSocket;
}

export function Modal(props: ModalProps) {
  const session_state = useLoRSelector(selectSessionState);

  return (
    <div className={style.modalBackground}>
      <div className={style.modalContainer}>
        <div className={style.body}>
          {isSignedIn(session_state) ? (
            <UserComponent
              socket={props.socket}
              authInfo={session_state.authInfo}
            />
          ) : (
            <SignIn socket={props.socket} />
          )}
        </div>
      </div>
    </div>
  );
}
