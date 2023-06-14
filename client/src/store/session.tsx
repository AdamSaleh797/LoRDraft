import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { Buffer } from 'buffer'

import {
  LoRDraftClientSocket,
  LoginCred,
  RegisterInfo,
  SessionCred,
} from 'common/game/socket-msgs'
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { CachedAuthInfo } from 'client/components/auth/cached_auth_info'
import { LoRDispatch, RootState } from 'client/store'
import { clearDraftState, doUpdateDraftAsync } from 'client/store/draft'
import { ThunkAPI, makeThunkPromise } from 'client/store/util'

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
  cached_auth_info: CachedAuthInfo
  state: UserSessionState
  message_in_flight: SessionStateMessage | null
}

export interface SignedOutSession extends SessionState {
  state: UserSessionState.SIGNED_OUT
}

export interface SignedInSession extends SessionState {
  state: UserSessionState.SIGNED_IN
  authInfo: SessionCred
}

export function shouldInitialize(session_state: SessionState) {
  // Only initialize if uninitialized and there isn't already a join_session
  // request out.
  return (
    session_state.state === UserSessionState.UNINITIALIZED &&
    session_state.message_in_flight !== SessionStateMessage.JOIN_SESSION
  )
}

export function isSignedIn(
  session_state: SessionState
): session_state is SignedInSession {
  return session_state.state === UserSessionState.SIGNED_IN
}

export async function tryInitializeUserSession(
  dispatch: LoRDispatch,
  args: InitializeArgs
) {
  const result = await dispatch(doInitializeAsync(args))
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch initialize action'
    )
  } else if (!isOk(result.payload)) {
    return result.payload
  }

  // If we were able to login successfully, try joining a draft
  dispatch(
    doUpdateDraftAsync({
      socket: args.socket,
      auth_info: result.payload.value,
    })
  )
  return OkStatus
}

export async function loginUser(dispatch: LoRDispatch, args: LoginArgs) {
  const result = await dispatch(doLoginAsync(args))
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch login action'
    )
  } else if (!isOk(result.payload)) {
    return result.payload
  }

  // If we were able to login successfully, try joining a draft
  dispatch(
    doUpdateDraftAsync({
      socket: args.socket,
      auth_info: result.payload.value,
    })
  )
  return OkStatus
}

export async function logoutUser(dispatch: LoRDispatch, args: LogoutArgs) {
  const result = await dispatch(doLogoutAsync(args))
  if (result.payload === undefined) {
    return makeErrStatus(
      StatusCode.REDUX_DISPATCH_FAILED,
      'Failed to dispatch logout action'
    )
  } else if (!isOk(result.payload)) {
    return result.payload
  }

  dispatch(clearDraftState())
  return OkStatus
}

export interface InitializeArgs {
  socket: LoRDraftClientSocket
  cached_auth_info: CachedAuthInfo
}

const doInitializeAsync = createAsyncThunk<
  Status<SessionCred>,
  InitializeArgs,
  ThunkAPI
>(
  'session/initializeAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      const auth_info = args.cached_auth_info.getStorageAuthInfo()
      if (auth_info === null) {
        resolve(
          makeErrStatus(
            StatusCode.NOT_LOGGED_IN,
            `No cached auth info found, not attempting to sign in`
          )
        )
        return
      }

      args.socket.call('join_session', auth_info, (status) => {
        if (!isOk(status)) {
          resolve(status)
        } else {
          const auth_info = status.value
          auth_info.token = Buffer.from(auth_info.token)
          resolve(makeOkStatus(auth_info))
        }
      })
    })
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState()
      if (
        session.state !== UserSessionState.UNINITIALIZED ||
        session.message_in_flight !== null
      ) {
        // If we aren't currently in the uninitialized state, or there's a
        // message in flight, don't execute.
        return false
      }
    },
  }
)

export interface LoginArgs {
  socket: LoRDraftClientSocket
  login_info: LoginCred
}

const doLoginAsync = createAsyncThunk<Status<SessionCred>, LoginArgs, ThunkAPI>(
  'session/loginAsync',
  async (args: LoginArgs) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('login', args.login_info, (status) => {
        if (!isOk(status)) {
          resolve(status)
        } else {
          const auth_info = status.value
          auth_info.token = Buffer.from(auth_info.token)
          resolve(makeOkStatus(auth_info))
        }
      })
    })
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState()
      if (
        session.state !== UserSessionState.SIGNED_OUT ||
        session.message_in_flight !== null
      ) {
        // If we aren't currently signed out, or there's a message in flight,
        // don't execute.
        return false
      }
    },
  }
)

export interface LogoutArgs {
  socket: LoRDraftClientSocket
  auth_info: SessionCred
}

const doLogoutAsync = createAsyncThunk<Status, LogoutArgs, ThunkAPI>(
  'session/logoutAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('logout', args.auth_info, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState()
      if (
        session.state !== UserSessionState.SIGNED_IN ||
        session.message_in_flight !== null
      ) {
        // If we aren't currently signed in, or there's a message in flight,
        // don't execute.
        return false
      }
    },
  }
)

export interface RegisterArgs {
  socket: LoRDraftClientSocket
  register_info: RegisterInfo
}

export const doRegisterAsync = createAsyncThunk<Status, RegisterArgs, ThunkAPI>(
  'session/registerAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('register', args.register_info, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { session } = getState()
      if (
        session.state !== UserSessionState.SIGNED_OUT ||
        session.message_in_flight !== null
      ) {
        // If we aren't currently signed out, or there's a message in flight,
        // don't execute.
        return false
      }
    },
  }
)

function getInitialSessionState(): SessionState {
  return {
    cached_auth_info: CachedAuthInfo.initialStorageAuthInfo(),
    state: UserSessionState.UNINITIALIZED,
    message_in_flight: null,
  }
}

const sessionStateSlice = createSlice({
  name: 'session',
  initialState: getInitialSessionState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(doInitializeAsync.pending, (state) => {
        if (
          state.state === UserSessionState.UNINITIALIZED &&
          state.message_in_flight === null
        ) {
          // While in state 'JOIN_SESSION', the only methods that can change
          // the login state are the fullfilled/rejected callbacks for this
          // request.
          state.message_in_flight = SessionStateMessage.JOIN_SESSION
        }
      })
      .addCase(doInitializeAsync.fulfilled, (_state, action) => {
        if (!isOk(action.payload)) {
          // If logging in failed, we should clear the cached storage auth info
          // and transition to SIGNED_OUT.
          return {
            cached_auth_info: CachedAuthInfo.clearStorageAuthInfo(),
            state: UserSessionState.SIGNED_OUT,
            message_in_flight: null,
          }
        }

        // If joining the session succeeded, then we can transition straight to
        // SIGNED_IN and refresh the cached auth info (in case what the server
        // sent back was different from before).
        return {
          cached_auth_info: CachedAuthInfo.setStorageAuthInfo(
            action.payload.value
          ),
          state: UserSessionState.SIGNED_IN,
          message_in_flight: null,
          authInfo: action.payload.value,
        }
      })
      .addCase(doLoginAsync.pending, (state) => {
        state.message_in_flight = SessionStateMessage.LOGIN_REQUEST
      })
      .addCase(doLoginAsync.fulfilled, (state, action) => {
        if (!isOk(action.payload)) {
          // Only if this wasn't an invalid redux transition, then the socket
          // call failed and we can clear the message_in_flight status. Otherwise
          // this call did not set the message_in_flight status, so we can't
          // clear it.
          state.message_in_flight = null
          return
        }

        return {
          cached_auth_info: CachedAuthInfo.setStorageAuthInfo(
            action.payload.value
          ),
          state: UserSessionState.SIGNED_IN,
          message_in_flight: null,
          authInfo: action.payload.value,
        }
      })
      .addCase(doLogoutAsync.pending, (state) => {
        state.message_in_flight = SessionStateMessage.LOGOUT_REQUEST
      })
      .addCase(doLogoutAsync.fulfilled, (state, action) => {
        if (!isOk(action.payload)) {
          // The socket call failed and we can clear the message_in_flight
          // status.
          state.message_in_flight = null
          return
        }

        return {
          cached_auth_info: CachedAuthInfo.clearStorageAuthInfo(),
          state: UserSessionState.SIGNED_OUT,
          message_in_flight: null,
        }
      })
      .addCase(doRegisterAsync.pending, (state) => {
        state.message_in_flight = SessionStateMessage.REGISTER_REQUEST
      })
      .addCase(doRegisterAsync.fulfilled, (state, action) => {
        state.message_in_flight = null

        // Only update the state if the call succeeded.
        if (isOk(action.payload)) {
          state.state = UserSessionState.SIGNED_OUT
        }
      })
  },
})

export function selectSessionState(state: RootState) {
  return state.session
}

export default sessionStateSlice.reducer
