import crypto from 'crypto'
import {
  LoginCred,
  LoginCredT,
  LoRDraftSocket,
  RegisterInfo,
  RegisterInfoT,
  SessionCredT,
} from 'socket-msgs'

import { isOk, MakeErrStatus, OkStatus, Status, StatusCode } from 'lor_util'
import assert from 'assert'

// Expiration time of sessions in milliseconds.
const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000

export interface SessionAuthInfo {
  token: Buffer
  // The last time the user provided their login credentials, in milliseconds
  // from the epoch.
  login_time: number
}

export interface AuthUser {
  username: string
  password_hash: Buffer
  email: string
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
  socket.on('register_req', (register_info) => {
    if (!RegisterInfoT.guard(register_info)) {
      // Invalid input, we can ignore
      console.log('received invalid register input:')
      console.log(register_info)
      return
    }

    register(register_info, (status) => {
      socket.emit('register_res', status)
    })
  })

  socket.on('login_req', (login_cred?: LoginCred) => {
    if (!LoginCredT.guard(login_cred)) {
      // Invalid input, we can ignore
      console.log('received invalid login input:')
      console.log(login_cred)
      return
    }

    login(login_cred, (status, auth_user) => {
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

  socket.on('join_session_req', (session_cred) => {
    if (!SessionCredT.guard(session_cred)) {
      // Invalid input, we can ignore
      console.log('received invalid join session input:')
      console.log(session_cred)
      return
    }

    join_session(
      session_cred.username,
      session_cred.token,
      (status, auth_user) => {
        if (!isOk(status)) {
          socket.emit('join_session_res', status)
          return
        }
        assert(auth_user !== undefined)

        socket.emit('join_session_res', status, {
          username: session_cred.username,
          token: auth_user.session_info.token,
        })
      }
    )
  })

  socket.on('logout_req', (session_cred) => {
    if (!SessionCredT.guard(session_cred)) {
      // Invalid input, we can ignore
      console.log('received invalid logout input:')
      console.log(session_cred)
      return
    }

    join_session(
      session_cred.username,
      session_cred.token,
      (status, auth_user) => {
        if (!isOk(status)) {
          socket.emit('logout_res', status)
          return
        }
        assert(auth_user !== undefined)

        logout(auth_user, (status) => {
          socket.emit('logout_res', status)
        })
      }
    )
  })
}

function register(
  register_info: RegisterInfo,
  callback: (status: Status) => void
) {
  const auth_user = users.get(register_info.username)
  if (auth_user !== undefined) {
    callback(
      MakeErrStatus(
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
    password_hash: password_hash,
    email: register_info.email,
    logged_in: false,
  }

  users.set(register_info.username, new_user)
  callback(OkStatus)
}

export function login(
  login_cred: LoginCred,
  callback: (status: Status, auth_user?: AuthUser) => void
): void {
  const auth_user = users.get(login_cred.username)
  if (auth_user === undefined) {
    callback(
      MakeErrStatus(
        StatusCode.UNKNOWN_USER,
        `Unknown user ${login_cred.username}`
      )
    )
    return
  }

  if (auth_user.logged_in) {
    callback(
      MakeErrStatus(
        StatusCode.LOGGED_IN,
        `User ${login_cred.username} is already logged in`
      )
    )
    return
  }

  const hash = crypto.createHash(PASSWORD_HASH_METHOD)
  const password_hash = hash.update(login_cred.password).digest()
  if (!crypto.timingSafeEqual(password_hash, auth_user.password_hash)) {
    callback(
      MakeErrStatus(
        StatusCode.INCORRECT_PASSWORD,
        `Password for user ${login_cred.username} is incorrect`
      )
    )
    return
  }

  // Generate a token that the client can use for authentication on all future
  // requests in this session.
  const token = crypto.randomBytes(TOKEN_LENGTH)

  const now = new Date().getTime()

  auth_user.logged_in = true
  auth_user.session_info = {
    token: token,
    login_time: now,
  }
  callback(OkStatus, auth_user)
}

export function logout(
  auth_user: LoggedInAuthUser,
  callback: (status: Status) => void
): void {
  auth_user.logged_in = false
  ;(auth_user as AuthUser).session_info = undefined
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

  if (
    token.length !== auth_user.session_info.token.length ||
    !crypto.timingSafeEqual(token, auth_user.session_info.token)
  ) {
    callback(
      MakeErrStatus(
        StatusCode.INVALID_TOKEN,
        `Token provided for ${username} is invalid`
      )
    )
    return
  }

  const now = new Date().getTime()
  if (now - auth_user.session_info.login_time > SESSION_EXPIRATION_TIME) {
    // This session is expired.
    logout(auth_user, (status) => {
      if (!isOk(status)) {
        callback(status)
      } else {
        callback(
          MakeErrStatus(
            StatusCode.NOT_LOGGED_IN,
            `User ${username} is not logged in`
          )
        )
      }
    })
    return
  }

  callback(OkStatus, auth_user)
}
