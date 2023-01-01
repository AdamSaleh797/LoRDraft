import crypto from 'crypto'
import { LoginCred, LoRDraftSocket } from 'socket-msgs'

import { isOk, MakeErrStatus, OkStatus, Status, StatusCode } from 'lor_util'
import assert from 'assert'

export interface SessionAuthInfo {
  token: Buffer
}

export interface AuthUser {
  password_hash: Buffer
  logged_in: boolean
  // Defined only when logged in.
  session_info?: SessionAuthInfo
}

export interface LoggedInAuthUser extends AuthUser {
  session_info: SessionAuthInfo
}

type AuthUserDict = Map<string, AuthUser>

const PASSWORD_HASH_METHOD = 'sha256'
const TOKEN_LENGTH = 256

const users: AuthUserDict = new Map()

function logged_in(auth_user: AuthUser): auth_user is LoggedInAuthUser {
  return auth_user.logged_in
}

export function init_auth(socket: LoRDraftSocket): void {
  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const password_hash = hash.update('test_pw').digest()
  users.set('clayton', {
    password_hash: password_hash,
    logged_in: false,
  })

  socket.on('login_req', (login_cred?: LoginCred) => {
    if (login_cred === undefined) {
      // Invalid input, we can ignore
      return
    }

    login(login_cred.username, login_cred.password, (status, auth_user) => {
      if (!isOk(status)) {
        socket.emit('login_res', status)
        return
      }

      assert(auth_user !== undefined && logged_in(auth_user))

      socket.emit('login_res', status, {
        username: login_cred.username,
        token: auth_user.session_info.token,
      })
    })
  })
}

export function login(
  username: string,
  password: string,
  callback: (status: Status, auth_user?: AuthUser) => void
): void {
  const auth_user = users.get(username)
  if (auth_user === undefined) {
    callback(MakeErrStatus(StatusCode.UNKNOWN_USER, `Unknown user ${username}`))
    return
  }

  if (auth_user.logged_in) {
    callback(
      MakeErrStatus(
        StatusCode.LOGGED_IN,
        `User ${username} is already logged in`
      )
    )
    return
  }

  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const password_hash = hash.update(password).digest()
  if (!crypto.timingSafeEqual(password_hash, auth_user.password_hash)) {
    callback(
      MakeErrStatus(
        StatusCode.INCORRECT_PASSWORD,
        `Password for user ${username} is incorrect`
      )
    )
    return
  }

  // Generate a token that the client can use for authentication on all future
  // requests in this session.
  const token = crypto.randomBytes(TOKEN_LENGTH)

  auth_user.logged_in = true
  auth_user.session_info = {
    token: token,
  }
  callback(OkStatus, auth_user)
}

export function logout(
  username: string,
  callback: (status: Status) => void
): void {
  const auth_user = users.get(username)
  if (auth_user === undefined) {
    callback(MakeErrStatus(StatusCode.UNKNOWN_USER, `Unknown user ${username}`))
    return
  }

  if (!auth_user.logged_in) {
    callback(
      MakeErrStatus(
        StatusCode.NOT_LOGGED_IN,
        `User ${username} is not logged in`
      )
    )
    return
  }

  auth_user.logged_in = false
  auth_user.session_info = undefined
  callback(OkStatus)
}

export function join_session(
  username: string,
  token: Buffer,
  callback: (status: Status, auth_user?: LoggedInAuthUser) => void
): void {
  const auth_user = users.get(username)
  if (auth_user === undefined) {
    callback(MakeErrStatus(StatusCode.UNKNOWN_USER, `Unknown user ${username}`))
    return
  }

  if (!logged_in(auth_user)) {
    callback(
      MakeErrStatus(
        StatusCode.NOT_LOGGED_IN,
        `User ${username} is not logged in`
      )
    )
    return
  }

  if (!crypto.timingSafeEqual(token, auth_user.session_info.token)) {
    callback(
      MakeErrStatus(
        StatusCode.MISSING_TOKEN,
        `Token provided for ${username} is invalid`
      )
    )
    return
  }

  callback(OkStatus, auth_user)
}
