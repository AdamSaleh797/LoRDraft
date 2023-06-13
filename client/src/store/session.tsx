import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import {
  LoRDraftClientSocket,
  LoginCred,
  RegisterInfo,
  SessionCred,
} from 'common/game/socket-msgs'
import {
  ErrStatusT,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
} from 'common/util/status'

import { CachedAuthInfo } from 'client/components/auth/cached_auth_info'
import { RootState } from 'client/store'

interface ThunkAPI {
  state: RootState
  rejectValue: ErrStatusT
}

type PromiseRejection = (reason: ErrStatusT) => void

function makeThunkPromise<T>(
  callback: (resolve: (value: T) => void, reject: PromiseRejection) => void
) {
  return new Promise<T>((inner_resolve, inner_reject) => {
    callback(inner_resolve, (status) => {
      console.log('Failed async thunk:', status)
      inner_reject(status.message)
    })
  })
}

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

export function isSignedIn(
  session_state: SessionState
): session_state is SignedInSession {
  return session_state.state === UserSessionState.SIGNED_IN
}

export interface InitializeArgs {
  socket: LoRDraftClientSocket
}

export const doInitializeAsync = createAsyncThunk<
  SessionCred,
  InitializeArgs,
  ThunkAPI
>('session/initializeAsync', async (args, thunk_api) => {
  return await makeThunkPromise((resolve, reject) => {
    const state = thunk_api.getState().session
    if (state.message_in_flight !== SessionStateMessage.JOIN_SESSION) {
      reject(
        makeErrStatus(
          StatusCode.INVALID_REDUX_TRANSITION,
          `Cannot join session from ${state.state}`
        )
      )
      return
    }

    const auth_info = state.cached_auth_info.getStorageAuthInfo()
    if (auth_info === null) {
      reject(
        makeErrStatus(
          StatusCode.NOT_LOGGED_IN,
          `No cached auth info found, not attempting to sign in`
        )
      )
      return
    }

    args.socket.call('join_session', auth_info, (status) => {
      if (!isOk(status)) {
        reject(status)
      } else {
        resolve(status.value)
      }
    })
  })
})

export interface LoginArgs {
  socket: LoRDraftClientSocket
  login_info: LoginCred
}

export const doLoginAsync = createAsyncThunk<SessionCred, LoginArgs, ThunkAPI>(
  'session/loginAsync',
  async (args, thunk_api) => {
    return await makeThunkPromise((resolve, reject) => {
      const state = thunk_api.getState().session
      if (state.message_in_flight !== SessionStateMessage.LOGIN_REQUEST) {
        reject(
          makeErrStatus(
            StatusCode.INVALID_REDUX_TRANSITION,
            `Cannot login from ${state.state}`
          )
        )
        return
      }

      args.socket.call('login', args.login_info, (status) => {
        if (!isOk(status)) {
          reject(status)
        } else {
          resolve(status.value)
        }
      })
    })
  }
)

export interface LogoutArgs {
  socket: LoRDraftClientSocket
  auth_info: SessionCred
}

export const doLogoutAsync = createAsyncThunk<Status, LogoutArgs, ThunkAPI>(
  'session/logoutAsync',
  async (args, thunk_api) => {
    return await makeThunkPromise((resolve, reject) => {
      const state = thunk_api.getState().session
      if (state.message_in_flight !== SessionStateMessage.LOGOUT_REQUEST) {
        reject(
          makeErrStatus(
            StatusCode.INVALID_REDUX_TRANSITION,
            `Cannot log out from ${state.state}`
          )
        )
        return
      }

      args.socket.call('logout', args.auth_info, (status) => {
        if (!isOk(status)) {
          reject(status)
        } else {
          resolve(status)
        }
      })
    })
  }
)

export interface RegisterArgs {
  socket: LoRDraftClientSocket
  register_info: RegisterInfo
  callback?: (status: Status) => void
}

export const doRegisterAsync = createAsyncThunk<Status, RegisterArgs, ThunkAPI>(
  'session/registerAsync',
  async (args, thunk_api) => {
    return await makeThunkPromise((resolve, reject) => {
      const state = thunk_api.getState().session
      if (state.message_in_flight !== SessionStateMessage.REGISTER_REQUEST) {
        reject(
          makeErrStatus(
            StatusCode.INVALID_REDUX_TRANSITION,
            `Cannot register from ${state.state}`
          )
        )
        return
      }

      args.socket.call('register', args.register_info, (status) => {
        if (!isOk(status)) {
          reject(status)
        } else {
          resolve(status)
        }
      })
    })
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
        return {
          cached_auth_info: CachedAuthInfo.setStorageAuthInfo(action.payload),
          state: UserSessionState.SIGNED_IN,
          message_in_flight: null,
          authInfo: action.payload,
        }
      })
      .addCase(doInitializeAsync.rejected, (state, reason) => {
        // Only if this wasn't an invalid redux transition, then the socket
        // call failed and we can clear the message_in_flight status. Otherwise
        // this call did not set the message_in_flight status, so we can't
        // clear it.
        if (reason.payload?.status !== StatusCode.INVALID_REDUX_TRANSITION) {
          state.message_in_flight = null

          // If logging in failed, we should clear the cached storage auth info
          // and transition to SIGNED_OUT.
          return {
            cached_auth_info: CachedAuthInfo.clearStorageAuthInfo(),
            state: UserSessionState.SIGNED_OUT,
            message_in_flight: null,
          }
        }
      })
      .addCase(doLoginAsync.pending, (state) => {
        if (
          state.state === UserSessionState.SIGNED_OUT &&
          state.message_in_flight === null
        ) {
          // While in state 'LOGIN_REQUEST', the only methods that can change
          // the login state are the fullfilled/rejected callbacks for this
          // request.
          state.message_in_flight = SessionStateMessage.LOGIN_REQUEST
        }
      })
      .addCase(doLoginAsync.fulfilled, (state, action) => {
        return {
          cached_auth_info: state.cached_auth_info,
          state: UserSessionState.SIGNED_IN,
          message_in_flight: null,
          authInfo: action.payload,
        }
      })
      .addCase(doLoginAsync.rejected, (state, reason) => {
        // Only if this wasn't an invalid redux transition, then the socket
        // call failed and we can clear the message_in_flight status. Otherwise
        // this call did not set the message_in_flight status, so we can't
        // clear it.
        if (reason.payload?.status !== StatusCode.INVALID_REDUX_TRANSITION) {
          state.message_in_flight = null
        }
      })
      .addCase(doLogoutAsync.pending, (state) => {
        if (
          state.state === UserSessionState.SIGNED_OUT &&
          state.message_in_flight === null
        ) {
          // While in state 'LOGOUT_REQUEST', the only methods that can change
          // the login state are the fullfilled/rejected callbacks for this
          // request.
          state.message_in_flight = SessionStateMessage.LOGOUT_REQUEST
        }
      })
      .addCase(doLogoutAsync.fulfilled, (state) => {
        return {
          cached_auth_info: state.cached_auth_info,
          state: UserSessionState.SIGNED_OUT,
          message_in_flight: null,
        }
      })
      .addCase(doLogoutAsync.rejected, (state, reason) => {
        // Only if this wasn't an invalid redux transition, then the socket
        // call failed and we can clear the message_in_flight status. Otherwise
        // this call did not set the message_in_flight status, so we can't
        // clear it.
        if (reason.payload?.status !== StatusCode.INVALID_REDUX_TRANSITION) {
          state.message_in_flight = null
        }
      })
      .addCase(doRegisterAsync.pending, (state) => {
        if (
          state.state === UserSessionState.SIGNED_OUT &&
          state.message_in_flight === null
        ) {
          // While in state 'REGISTER_REQUEST', the only methods that can change
          // the login state are the fullfilled/rejected callbacks for this
          // request.
          state.message_in_flight = SessionStateMessage.REGISTER_REQUEST
        }
      })
      .addCase(doRegisterAsync.fulfilled, (state, action) => {
        state.state = UserSessionState.SIGNED_OUT
        if (action.meta.arg.callback !== undefined) {
          action.meta.arg.callback(action.payload)
        }
      })
      .addCase(doRegisterAsync.rejected, (state, reason) => {
        // Only if this wasn't an invalid redux transition, then the socket
        // call failed and we can clear the message_in_flight status. Otherwise
        // this call did not set the message_in_flight status, so we can't
        // clear it.
        if (reason.payload?.status !== StatusCode.INVALID_REDUX_TRANSITION) {
          state.message_in_flight = null
        }

        if (reason.meta.arg.callback !== undefined) {
          reason.meta.arg.callback(
            reason.payload ??
              makeErrStatus(
                StatusCode.INTERNAL_SERVER_ERROR,
                'No status associated with rejected promise payload'
              )
          )
        }
      })
  },
})

export function selectSessionState(state: RootState) {
  return state.session
}

export default sessionStateSlice.reducer
