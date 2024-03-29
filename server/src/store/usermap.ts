import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import crypto from 'crypto';
import { Draft } from 'immer';
import { DeepReadonly } from 'ts-essentials';

import { DraftStateInfo } from 'common/game/draft';
import { LoginCred, RegisterInfo } from 'common/game/socket-msgs';
import {
  OkStatus,
  Status,
  StatusCode,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

import { RootState, dispatch, persistor, store } from 'server/store';

const PASSWORD_HASH_METHOD = 'sha256';
const TOKEN_LENGTH = 256;

export const INVALID_CREDENTIALS_MSG = 'Incorrect username or password.';

export interface SessionAuthInfo {
  // Base-64 encoded token.
  readonly token: string;
  // The last time the user provided their login credentials, in milliseconds
  // from the epoch.
  readonly loginTime: number;
}

export interface SessionInfo {
  readonly username: string;
  readonly authInfo: SessionAuthInfo;
  readonly draftState?: DeepReadonly<DraftStateInfo>;
}

export interface AuthUser {
  readonly username: string;
  // Base-64 encoded password hash
  readonly passwordHash: string;
  readonly email: string;
  readonly loggedIn: boolean;
  // Defined only when logged in.
  readonly sessionInfo?: SessionInfo;
}

export interface LoggedInAuthUser extends AuthUser {
  readonly sessionInfo: SessionInfo;
}

export type Usermap = Partial<Record<string, AuthUser>>;

export interface InDraftSessionInfo extends SessionInfo {
  draftState: DeepReadonly<DraftStateInfo>;
}

export function userLoggedIn(
  auth_user: AuthUser
): auth_user is LoggedInAuthUser {
  return auth_user.loggedIn;
}

/**
 * Narrows a `Draft<AuthUser>` type to `Draft<LoggedInAuthUser>`, since
 * `userLoggedIn` will narrow `Draft<AuthUser>` incorrectly to `Draft<AuthUser>
 * | LoggedInAuthUser`.
 */
function userLoggedInDraft(
  auth_user: Draft<AuthUser>
): auth_user is Draft<LoggedInAuthUser> {
  return auth_user.loggedIn;
}

function logout(user: Draft<LoggedInAuthUser>) {
  user.loggedIn = false;
  (user as Draft<AuthUser>).sessionInfo = undefined;
}

const initialState: Usermap = {};

const usermapSlice = createSlice({
  name: 'usermap',
  initialState,
  reducers: {
    registerUser: (
      usermap,
      action: PayloadAction<{
        registerInfo: RegisterInfo;
        passwordHash: string;
      }>
    ) => {
      const { registerInfo, passwordHash } = action.payload;

      usermap[registerInfo.username] = {
        username: registerInfo.username,
        passwordHash,
        email: registerInfo.email,
        loggedIn: false,
      };
    },

    loginUser: (
      usermap,
      action: PayloadAction<{
        loginCred: LoginCred;
        authInfo: SessionAuthInfo;
      }>
    ) => {
      const { loginCred, authInfo } = action.payload;

      const auth_user = usermap[loginCred.username] as Draft<AuthUser>;

      // If the user is already logged in, log them out to erase the ephemeral
      // information associated with the old login session.
      if (userLoggedInDraft(auth_user)) {
        logout(auth_user);
      }

      auth_user.loggedIn = true;
      auth_user.sessionInfo = { username: loginCred.username, authInfo };
    },

    logoutUser: (usermap, action: PayloadAction<{ username: string }>) => {
      const { username } = action.payload;
      const auth_user = usermap[username] as Draft<LoggedInAuthUser>;
      logout(auth_user);
    },

    updateDraft: (
      usermap,
      action: PayloadAction<{
        sessionInfo: SessionInfo;
        draftState: DeepReadonly<DraftStateInfo>;
      }>
    ) => {
      const { sessionInfo, draftState } = action.payload;
      const authUser = usermap[sessionInfo.username] as Draft<LoggedInAuthUser>;
      authUser.sessionInfo.draftState = draftState as Draft<
        DeepReadonly<DraftStateInfo>
      >;
    },

    exitDraft: (
      usermap,
      action: PayloadAction<{
        sessionInfo: SessionInfo;
      }>
    ) => {
      const { sessionInfo } = action.payload;
      const authUser = usermap[sessionInfo.username] as Draft<LoggedInAuthUser>;
      delete authUser.sessionInfo.draftState;
    },
  },
});

export function selectUsermapState(state: RootState): Usermap {
  return state.usermap;
}

export function registerUser(registerInfo: RegisterInfo): Status {
  const usermap = selectUsermapState(store.getState());
  const auth_user = usermap[registerInfo.username];
  if (auth_user !== undefined) {
    return makeErrStatus(StatusCode.USER_ALREADY_EXISTS, `User already exists`);
  }

  // TODO: check that email is not already used

  const hash = crypto.createHash(PASSWORD_HASH_METHOD);
  const passwordHash = hash
    .update(registerInfo.password)
    .digest()
    .toString('base64');
  dispatch(
    usermapSlice.actions.registerUser({
      registerInfo,
      passwordHash,
    })
  );
  persistor.persist();
  return OkStatus;
}

export function loginUser(loginCred: LoginCred): Status<SessionAuthInfo> {
  const usermap = selectUsermapState(store.getState());
  const auth_user = usermap[loginCred.username];
  if (auth_user === undefined) {
    return makeErrStatus(
      StatusCode.INVALID_CREDENTIALS,
      INVALID_CREDENTIALS_MSG
    );
  }

  const hash = crypto.createHash(PASSWORD_HASH_METHOD);
  const password_hash = hash.update(loginCred.password).digest();
  const auth_user_password_hash = Buffer.from(auth_user.passwordHash, 'base64');
  if (
    password_hash.length !== auth_user_password_hash.length ||
    !crypto.timingSafeEqual(password_hash, auth_user_password_hash)
  ) {
    return makeErrStatus(
      StatusCode.INVALID_CREDENTIALS,
      INVALID_CREDENTIALS_MSG
    );
  }

  // Generate a token that the client can use for authentication on all future
  // requests in this session.
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('base64');
  const now = new Date().getTime();
  const authInfo = {
    token,
    loginTime: now,
  };

  dispatch(
    usermapSlice.actions.loginUser({
      loginCred,
      authInfo,
    })
  );
  persistor.persist();
  return makeOkStatus(authInfo);
}

export function logoutUser(authUser: LoggedInAuthUser) {
  dispatch(usermapSlice.actions.logoutUser({ username: authUser.username }));
  persistor.persist();
}

export function updateDraft(
  sessionInfo: SessionInfo,
  draftState: DeepReadonly<DraftStateInfo>
) {
  dispatch(usermapSlice.actions.updateDraft({ sessionInfo, draftState }));
  persistor.persist();
}

export function exitDraft(sessionInfo: SessionInfo): Status {
  if (!inDraft(sessionInfo)) {
    return makeErrStatus(
      StatusCode.NOT_IN_DRAFT_SESSION,
      'Not in draft session'
    );
  }

  dispatch(usermapSlice.actions.exitDraft({ sessionInfo }));
  persistor.persist();
  return OkStatus;
}

export function inDraft(
  sessionInfo: SessionInfo
): sessionInfo is InDraftSessionInfo {
  return sessionInfo.draftState !== undefined;
}

export function getDraftState(
  auth_user: LoggedInAuthUser
): Status<DeepReadonly<DraftStateInfo>> {
  if (!inDraft(auth_user.sessionInfo)) {
    return makeErrStatus(
      StatusCode.NOT_IN_DRAFT_SESSION,
      'No draft session found.'
    );
  } else {
    return makeOkStatus(auth_user.sessionInfo.draftState);
  }
}

export default usermapSlice.reducer;
