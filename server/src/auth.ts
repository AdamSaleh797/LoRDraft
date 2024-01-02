import { Buffer } from 'buffer';
import crypto from 'crypto';

import {
  AuthInfo,
  AuthInfoT,
  LoRDraftSocket,
  LoginCred,
  LoginCredT,
  RegisterInfoT,
} from 'common/game/socket-msgs';
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

import { store } from 'server/store';
import {
  INVALID_CREDENTIALS_MSG,
  LoggedInAuthUser,
  loginUser,
  logoutUser,
  registerUser,
  selectUsermapState,
  userLoggedIn,
} from 'server/store/usermap';

// Expiration time of sessions in milliseconds.
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000;

export function initAuth(socket: LoRDraftSocket): void {
  socket.respond('register', (resolve, register_info) => {
    if (!RegisterInfoT.guard(register_info)) {
      // Invalid input, we can ignore
      return;
    }

    resolve(registerUser(register_info));
  });

  socket.respond('login', (resolve, login_cred?: LoginCred) => {
    if (!LoginCredT.guard(login_cred)) {
      // Invalid input, we can ignore
      return;
    }

    const status = loginUser(login_cred);
    if (!isOk(status)) {
      resolve(status);
      return;
    }
    const auth_info = status.value;

    resolve(
      makeOkStatus({
        username: login_cred.username,
        token: auth_info.token,
      })
    );
  });

  socket.respond('join_session', (resolve, session_cred) => {
    const status = joinSession(session_cred);
    if (!isOk(status)) {
      resolve(status);
      return;
    }
    const auth_user = status.value;

    resolve(
      makeOkStatus({
        username: auth_user.username,
        token: auth_user.sessionInfo.authInfo.token,
      })
    );
  });

  socket.respond('logout', (resolve, session_cred) => {
    const status = joinSession(session_cred);
    if (!isOk(status)) {
      resolve(status);
    } else {
      logoutUser(status.value);
      resolve(OkStatus);
    }
  });
}

export function joinSession(
  session_cred: AuthInfo | undefined
): Status<LoggedInAuthUser> {
  if (!AuthInfoT.guard(session_cred)) {
    // Invalid input, we can ignore
    return makeErrStatus(
      StatusCode.INVALID_CLIENT_REQ,
      'Received invalid join session input'
    );
  }

  const usermap = selectUsermapState(store.getState());
  const username = session_cred.username;
  const token = Buffer.from(session_cred.token, 'base64');

  const auth_user = usermap[username];
  if (auth_user === undefined) {
    return makeErrStatus(
      StatusCode.INVALID_CREDENTIALS,
      INVALID_CREDENTIALS_MSG
    );
  }

  if (!userLoggedIn(auth_user)) {
    return makeErrStatus(
      StatusCode.NOT_LOGGED_IN,
      `User ${username} is not logged in`
    );
  }

  const auth_user_token = Buffer.from(
    auth_user.sessionInfo.authInfo.token,
    'base64'
  );
  if (
    token.length !== auth_user_token.length ||
    !crypto.timingSafeEqual(token, auth_user_token)
  ) {
    return makeErrStatus(
      StatusCode.INVALID_CREDENTIALS,
      INVALID_CREDENTIALS_MSG
    );
  }

  const now = new Date().getTime();
  if (
    now - auth_user.sessionInfo.authInfo.loginTime >
    SESSION_EXPIRATION_TIME
  ) {
    // This session is expired.
    logoutUser(auth_user);
    return makeErrStatus(
      StatusCode.NOT_LOGGED_IN,
      `User ${username} is not logged in`
    );
  }

  return makeOkStatus(auth_user);
}
