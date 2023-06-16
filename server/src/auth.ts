import crypto from 'crypto'

import {
  AuthInfo,
  AuthInfoT,
  LoRDraftSocket,
  LoginCred,
  LoginCredT,
  RegisterInfo,
  RegisterInfoT,
} from 'common/game/socket-msgs'
import {
  OkStatus,
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status'

import { SessionInfo } from 'server/session'

// Expiration time of sessions in milliseconds.
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000

export interface SessionAuthInfo {
  token: Buffer
  // The last time the user provided their login credentials, in milliseconds
  // from the epoch.
  loginTime: number
}

export interface AuthUser {
  username: string
  passwordHash: Buffer
  email: string
  loggedIn: boolean
  // Defined only when logged in.
  sessionInfo?: SessionInfo
}

export interface LoggedInAuthUser extends AuthUser {
  sessionInfo: SessionInfo
}

type AuthUserDict = Map<string, AuthUser>

const PASSWORD_HASH_METHOD = 'sha256'
const TOKEN_LENGTH = 256

const users: AuthUserDict = new Map()

function loggedIn(auth_user: AuthUser): auth_user is LoggedInAuthUser {
  return auth_user.loggedIn
}

export function initAuth(socket: LoRDraftSocket): void {
  socket.respond('register', (resolve, register_info) => {
    if (!RegisterInfoT.guard(register_info)) {
      // Invalid input, we can ignore
      console.log('received invalid register input:')
      console.log(register_info)
      return
    }

    register(register_info, (status) => {
      resolve(status)
    })
  })

  socket.respond('login', (resolve, login_cred?: LoginCred) => {
    if (!LoginCredT.guard(login_cred)) {
      // Invalid input, we can ignore
      console.log('received invalid login input:')
      console.log(login_cred)
      return
    }

    login(login_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      resolve(
        makeOkStatus({
          username: login_cred.username,
          token: auth_user.sessionInfo.authInfo.token,
        })
      )
    })
  })

  socket.respond('join_session', (resolve, session_cred) => {
    joinSession(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
        return
      }
      const auth_user = status.value

      resolve(
        makeOkStatus({
          username: auth_user.username,
          token: auth_user.sessionInfo.authInfo.token,
        })
      )
    })
  })

  socket.respond('logout', (resolve, session_cred) => {
    joinSession(session_cred, (status) => {
      if (!isOk(status)) {
        resolve(status)
      } else {
        resolve(logout(status.value))
      }
    })
  })
}

function register(
  register_info: RegisterInfo,
  callback: (status: Status) => void
) {
  const auth_user = users.get(register_info.username)
  if (auth_user !== undefined) {
    callback(
      makeErrStatus(
        StatusCode.USER_ALREADY_EXISTS,
        `User ${register_info.username} already exists`
      )
    )
    return
  }

  // TODO: check that email is not already used

  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const password_hash = hash.update(register_info.password).digest()
  const new_user = {
    username: register_info.username,
    passwordHash: password_hash,
    email: register_info.email,
    loggedIn: false,
  }

  users.set(register_info.username, new_user)
  callback(OkStatus)
}

export function login(
  login_cred: LoginCred,
  callback: (auth_user: Status<LoggedInAuthUser>) => void
): void {
  const auth_user = users.get(login_cred.username)
  if (auth_user === undefined) {
    callback(
      makeErrStatus(
        StatusCode.UNKNOWN_USER,
        `Unknown user ${login_cred.username}`
      )
    )
    return
  }

  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const password_hash = hash.update(login_cred.password).digest()
  if (!crypto.timingSafeEqual(password_hash, auth_user.passwordHash)) {
    callback(
      makeErrStatus(
        StatusCode.INCORRECT_PASSWORD,
        `Password for user ${login_cred.username} is incorrect`
      )
    )
    return
  }

  // If the user is already logged in, log them out to erase the ephemeral
  // information associated with the old login session.
  if (loggedIn(auth_user)) {
    const status = logout(auth_user)
    if (!isOk(status)) {
      callback(status)
      return
    }
  }

  // Generate a token that the client can use for authentication on all future
  // requests in this session.
  const token = crypto.randomBytes(TOKEN_LENGTH)

  const now = new Date().getTime()

  auth_user.loggedIn = true
  auth_user.sessionInfo = {
    authInfo: {
      token: token,
      loginTime: now,
    },
  }
  callback(makeOkStatus(auth_user as LoggedInAuthUser))
}

export function logout(auth_user: LoggedInAuthUser): Status {
  auth_user.loggedIn = false
  ;(auth_user as AuthUser).sessionInfo = undefined
  return OkStatus
}

export function joinSession(
  session_cred: AuthInfo | undefined,
  callback: (auth_user: Status<LoggedInAuthUser>) => void
): void {
  if (!AuthInfoT.guard(session_cred)) {
    // Invalid input, we can ignore
    callback(
      makeErrStatus(
        StatusCode.INVALID_CLIENT_REQ,
        'Received invalid join session input'
      )
    )
    return
  }

  const username = session_cred.username
  const token = session_cred.token

  const auth_user = users.get(username)
  if (auth_user === undefined) {
    callback(makeErrStatus(StatusCode.UNKNOWN_USER, `Unknown user ${username}`))
    return
  }

  if (!loggedIn(auth_user)) {
    callback(
      makeErrStatus(
        StatusCode.NOT_LOGGED_IN,
        `User ${username} is not logged in`
      )
    )
    return
  }

  if (
    token.length !== auth_user.sessionInfo.authInfo.token.length ||
    !crypto.timingSafeEqual(token, auth_user.sessionInfo.authInfo.token)
  ) {
    callback(
      makeErrStatus(
        StatusCode.INVALID_TOKEN,
        `Token provided for ${username} is invalid`
      )
    )
    return
  }

  const now = new Date().getTime()
  if (
    now - auth_user.sessionInfo.authInfo.loginTime >
    SESSION_EXPIRATION_TIME
  ) {
    // This session is expired.
    const status = logout(auth_user)
    if (!isOk(status)) {
      callback(status)
    } else {
      callback(
        makeErrStatus(
          StatusCode.NOT_LOGGED_IN,
          `User ${username} is not logged in`
        )
      )
    }
    return
  }

  callback(makeOkStatus(auth_user))
}
