import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import crypto from 'crypto'

import { LoginCred, RegisterInfo } from 'common/game/socket-msgs'
import {
  Status,
  StatusCode,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { SessionInfo } from 'server/session'
import { RootState, dispatch, persistor, store } from 'server/store'

const PASSWORD_HASH_METHOD = 'sha256'
const TOKEN_LENGTH = 256

export interface SessionAuthInfo {
  // Base-64 encoded token.
  token: string
  // The last time the user provided their login credentials, in milliseconds
  // from the epoch.
  loginTime: number
}

export interface AuthUser {
  username: string
  // Base-64 encoded password hash
  passwordHash: string
  email: string
  loggedIn: boolean
  // Defined only when logged in.
  sessionInfo?: SessionInfo
}

export interface LoggedInAuthUser extends AuthUser {
  sessionInfo: SessionInfo
}

export type Usermap = Partial<Record<string, AuthUser>>

export function userLoggedIn(
  auth_user: AuthUser
): auth_user is LoggedInAuthUser {
  return auth_user.loggedIn
}

function logout(user: LoggedInAuthUser) {
  user.loggedIn = false
  ;(user as AuthUser).sessionInfo = undefined
}

const initialState: Usermap = {}

const usermapSlice = createSlice({
  name: 'usermap',
  initialState,
  reducers: {
    registerUser: (
      usermap,
      action: PayloadAction<{
        registerInfo: RegisterInfo
        passwordHash: string
      }>
    ) => {
      const { registerInfo, passwordHash } = action.payload

      usermap[registerInfo.username] = {
        username: registerInfo.username,
        passwordHash,
        email: registerInfo.email,
        loggedIn: false,
      }
    },

    loginUser: (
      usermap,
      action: PayloadAction<{
        loginCred: LoginCred
        authInfo: SessionAuthInfo
      }>
    ) => {
      const { loginCred, authInfo } = action.payload

      const auth_user = usermap[loginCred.username] as AuthUser

      // If the user is already logged in, log them out to erase the ephemeral
      // information associated with the old login session.
      if (userLoggedIn(auth_user)) {
        logout(auth_user)
      }

      auth_user.loggedIn = true
      auth_user.sessionInfo = { authInfo }
    },

    logoutUser: (
      usermap,
      action: PayloadAction<{ authUser: LoggedInAuthUser }>
    ) => {
      logout(action.payload.authUser)
    },
  },
})

export function selectUsermapState(state: RootState): Usermap {
  return state.usermap
}

export function registerUser(
  registerInfo: RegisterInfo,
  callback: (status: Status) => void
) {
  const usermap = selectUsermapState(store.getState())
  const auth_user = usermap[registerInfo.username]
  if (auth_user !== undefined) {
    callback(
      makeErrStatus(
        StatusCode.USER_ALREADY_EXISTS,
        `User ${registerInfo.username} already exists`
      )
    )
    return
  }

  // TODO: check that email is not already used

  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const passwordHash = hash
    .update(registerInfo.password)
    .digest()
    .toString('base64')
  dispatch(
    usermapSlice.actions.registerUser({
      registerInfo,
      passwordHash,
    })
  )
  persistor.persist()
}

export function loginUser(
  loginCred: LoginCred,
  callback: (auth_user: Status<SessionAuthInfo>) => void
) {
  const usermap = selectUsermapState(store.getState())
  const auth_user = usermap[loginCred.username]
  if (auth_user === undefined) {
    callback(
      makeErrStatus(
        StatusCode.UNKNOWN_USER,
        `Unknown user ${loginCred.username}`
      )
    )
    return
  }

  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const password_hash = hash.update(loginCred.password).digest()
  const auth_user_password_hash = Buffer.from(auth_user.passwordHash, 'base64')
  if (
    password_hash.length !== auth_user_password_hash.length ||
    !crypto.timingSafeEqual(password_hash, auth_user_password_hash)
  ) {
    callback(
      makeErrStatus(
        StatusCode.INCORRECT_PASSWORD,
        `Password for user ${loginCred.username} is incorrect`
      )
    )
    return
  }

  // Generate a token that the client can use for authentication on all future
  // requests in this session.
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('base64')
  const now = new Date().getTime()
  const authInfo = {
    token,
    loginTime: now,
  }

  dispatch(
    usermapSlice.actions.loginUser({
      loginCred,
      authInfo,
    })
  )
  persistor.persist()
  callback(makeOkStatus(authInfo))
}

export function logoutUser(authUser: LoggedInAuthUser) {
  dispatch(usermapSlice.actions.logoutUser({ authUser }))
  persistor.persist()
}

export default usermapSlice.reducer
