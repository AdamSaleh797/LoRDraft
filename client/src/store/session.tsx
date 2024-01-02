import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  AuthInfo,
  LoRDraftClientSocket,
  LoginCred,
  RegisterInfo,
} from 'common/game/socket-msgs';
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
} from 'common/util/status';

import { CachedAuthInfo } from 'client/components/auth/cached_auth_info';
import { LoRDispatch, RootState } from 'client/store';
import { clearDraftState, doUpdateDraftAsync } from 'client/store/draft';
import { ThunkAPI } from 'client/store/util';

export const enum UserSessionState {
  UNINITIALIZED = 'UNINITIALIZED',
  SIGNED_OUT = 'SIGNED_OUT',
  SIGNED_IN = 'SIGNED_IN',
}

const enum SessionStateMessage {
  JOIN_SESSION = 'JOIN_SESSION',
  LOGIN_REQUEST = 'LOGIN_REQUEST',
  REGISTER_REQUEST = 'REGISTER_REQUEST',
  LOGOUT_REQUEST = 'LOGOUT_REQUEST',
}

export interface SessionState {
  cachedAuthInfo: CachedAuthInfo;
  state: UserSessionState;
  messageInFlight: SessionStateMessage | null;
}

export interface SignedOutSession extends SessionState {
  state: UserSessionState.SIGNED_OUT;
}

export interface SignedInSession extends SessionState {
  state: UserSessionState.SIGNED_IN;
  authInfo: AuthInfo;
}

/**
 * Returns true if the session state is ready to be initialized. If this returns
 * true, the caller should call `tryInitializeUserSession`.
 */
export function shouldInitialize(session_state: SessionState) {
  // Only initialize if uninitialized and there isn't already a join_session
  // request out.
  return (
    session_state.state === UserSessionState.UNINITIALIZED &&
    session_state.messageInFlight !== SessionStateMessage.JOIN_SESSION
  );
}

/**
 * Returns true if the session state is signed in. If true,
 * `session_state.authInfo` will become available on the state.
 */
export function isSignedIn(
  session_state: SessionState
): session_state is SignedInSession {
  return session_state.state === UserSessionState.SIGNED_IN;
}

/**
 * Will attempt to initialize a logged in session with cached auth info. If this
 * doesn't exist, or if the login request fails, the session goes to the logged
 * out state.
 */
export async function tryInitializeUserSession(
  dispatch: LoRDispatch,
  args: InitializeArgs
) {
  const result = await dispatch(doInitializeAsync(args));
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch initialize action'
    );
  } else if (!isOk(result.payload)) {
    return result.payload;
  }

  // If we were able to login successfully, try joining a draft
  dispatch(
    doUpdateDraftAsync({
      socket: args.socket,
      authInfo: result.payload.value,
    })
  );
  return OkStatus;
}

/**
 * Logs in with given username/password. If the login succeeds, the session
 * state is moved to the `SIGNED_IN` state.
 */
export async function loginUser(dispatch: LoRDispatch, args: LoginArgs) {
  const result = await dispatch(doLoginAsync(args));
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch login action'
    );
  } else if (!isOk(result.payload)) {
    return result.payload;
  }

  // If we were able to login successfully, try joining a draft
  dispatch(
    doUpdateDraftAsync({
      socket: args.socket,
      authInfo: result.payload.value,
    })
  );
  return OkStatus;
}

/**
 * Logs in with given username/password. If the login succeeds, the session
 * state is moved to the `SIGNED_IN` state.
 */
export async function registerUser(dispatch: LoRDispatch, args: RegisterArgs) {
  const result = await dispatch(doRegisterAsync(args));
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch register action'
    );
  } else if (!isOk(result.payload)) {
    return result.payload;
  }

  // If we were able to register successfully, try logging in.
  return await loginUser(dispatch, {
    socket: args.socket,
    loginInfo: {
      username: args.registerInfo.username,
      password: args.registerInfo.password,
    },
  });
}

/**
 * Logs out the session state. If the call succeeds, the session state moves to
 * `SIGNED_OUT`.
 */
export async function logoutUser(dispatch: LoRDispatch, args: LogoutArgs) {
  const result = await dispatch(doLogoutAsync(args));
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch logout action'
    );
  } else if (!isOk(result.payload)) {
    return result.payload;
  }

  dispatch(clearDraftState());
  return OkStatus;
}

export interface InitializeArgs {
  socket: LoRDraftClientSocket;
  cachedAuthInfo: CachedAuthInfo;
}

const doInitializeAsync = createAsyncThunk<
  Status<AuthInfo>,
  InitializeArgs,
  ThunkAPI
>(
  'session/initializeAsync',
  async (args) => {
    const auth_info = args.cachedAuthInfo.getStorageAuthInfo();
    if (auth_info === null) {
      return makeErrStatus(
        StatusCode.NOT_LOGGED_IN,
        `No cached auth info found, not attempting to sign in`
      );
    }

    return await args.socket.call('join_session', auth_info);
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState();
      if (
        session.state !== UserSessionState.UNINITIALIZED ||
        session.messageInFlight !== null
      ) {
        // If we aren't currently in the uninitialized state, or there's a
        // message in flight, don't execute.
        return false;
      }
    },
  }
);

export interface LoginArgs {
  socket: LoRDraftClientSocket;
  loginInfo: LoginCred;
}

const doLoginAsync = createAsyncThunk<Status<AuthInfo>, LoginArgs, ThunkAPI>(
  'session/loginAsync',
  async (args: LoginArgs) => {
    return await args.socket.call('login', args.loginInfo);
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState();
      if (
        session.state !== UserSessionState.SIGNED_OUT ||
        session.messageInFlight !== null
      ) {
        // If we aren't currently signed out, or there's a message in flight,
        // don't execute.
        return false;
      }
    },
  }
);

export interface LogoutArgs {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
}

const doLogoutAsync = createAsyncThunk<Status, LogoutArgs, ThunkAPI>(
  'session/logoutAsync',
  async (args) => {
    return await args.socket.call('logout', args.authInfo);
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState();
      if (
        session.state !== UserSessionState.SIGNED_IN ||
        session.messageInFlight !== null
      ) {
        // If we aren't currently signed in, or there's a message in flight,
        // don't execute.
        return false;
      }
    },
  }
);

export interface RegisterArgs {
  socket: LoRDraftClientSocket;
  registerInfo: RegisterInfo;
}

export const doRegisterAsync = createAsyncThunk<Status, RegisterArgs, ThunkAPI>(
  'session/registerAsync',
  async (args) => {
    return await args.socket.call('register', args.registerInfo);
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState();
      if (
        session.state !== UserSessionState.SIGNED_OUT ||
        session.messageInFlight !== null
      ) {
        // If we aren't currently signed out, or there's a message in flight,
        // don't execute.
        return false;
      }
    },
  }
);

function getInitialSessionState(): SessionState {
  return {
    cachedAuthInfo: CachedAuthInfo.initialStorageAuthInfo(),
    state: UserSessionState.UNINITIALIZED,
    messageInFlight: null,
  };
}

/**
 * Global manager for the current user session. All requests to log in, attach
 * to an existing session, and log out should be done through here.
 */
const sessionStateSlice = createSlice({
  name: 'session',
  initialState: getInitialSessionState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(doInitializeAsync.pending, (state) => {
        if (
          state.state === UserSessionState.UNINITIALIZED &&
          state.messageInFlight === null
        ) {
          // While in state 'JOIN_SESSION', the only methods that can change
          // the login state are the fullfilled/rejected callbacks for this
          // request.
          state.messageInFlight = SessionStateMessage.JOIN_SESSION;
        }
      })
      .addCase(doInitializeAsync.fulfilled, (_state, action) => {
        if (!isOk(action.payload)) {
          // If logging in failed, we should clear the cached storage auth info
          // and transition to SIGNED_OUT.
          return {
            cachedAuthInfo: CachedAuthInfo.clearStorageAuthInfo(),
            state: UserSessionState.SIGNED_OUT,
            messageInFlight: null,
          };
        }

        // If joining the session succeeded, then we can transition straight to
        // SIGNED_IN and refresh the cached auth info (in case what the server
        // sent back was different from before).
        return {
          cachedAuthInfo: CachedAuthInfo.setStorageAuthInfo(
            action.payload.value
          ),
          state: UserSessionState.SIGNED_IN,
          messageInFlight: null,
          authInfo: action.payload.value,
        };
      })
      .addCase(doLoginAsync.pending, (state) => {
        state.messageInFlight = SessionStateMessage.LOGIN_REQUEST;
      })
      .addCase(doLoginAsync.fulfilled, (state, action) => {
        if (!isOk(action.payload)) {
          // Only if this wasn't an invalid redux transition, then the socket
          // call failed and we can clear the message_in_flight status. Otherwise
          // this call did not set the message_in_flight status, so we can't
          // clear it.
          state.messageInFlight = null;
          return;
        }

        return {
          cachedAuthInfo: CachedAuthInfo.setStorageAuthInfo(
            action.payload.value
          ),
          state: UserSessionState.SIGNED_IN,
          messageInFlight: null,
          authInfo: action.payload.value,
        };
      })
      .addCase(doLogoutAsync.pending, (state) => {
        state.messageInFlight = SessionStateMessage.LOGOUT_REQUEST;
      })
      .addCase(doLogoutAsync.fulfilled, (state, action) => {
        if (!isOk(action.payload)) {
          // The socket call failed and we can clear the message_in_flight
          // status.
          state.messageInFlight = null;
          return;
        }

        return {
          cachedAuthInfo: CachedAuthInfo.clearStorageAuthInfo(),
          state: UserSessionState.SIGNED_OUT,
          messageInFlight: null,
        };
      })
      .addCase(doRegisterAsync.pending, (state) => {
        state.messageInFlight = SessionStateMessage.REGISTER_REQUEST;
      })
      .addCase(doRegisterAsync.fulfilled, (state, action) => {
        state.messageInFlight = null;

        // Only update the state if the call succeeded.
        if (isOk(action.payload)) {
          state.state = UserSessionState.SIGNED_OUT;
        }
      });
  },
});

export function selectSessionState(state: RootState) {
  return state.session;
}

export default sessionStateSlice.reducer;
