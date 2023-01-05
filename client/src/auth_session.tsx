import React from 'react'

import { Buffer } from 'buffer'
import {
  LoginCred,
  LoRDraftClientSocket,
  RegisterInfo,
  SessionCred,
  SessionCredT,
} from 'socket-msgs'
import { isOk } from 'lor_util'
import { StateMachine } from 'state_machine'

const STORAGE_AUTH_INFO_KEY = 'auth_info'

export function getStorageAuthInfo(): SessionCred | null {
  const auth_info_str = window.sessionStorage.getItem(STORAGE_AUTH_INFO_KEY)
  if (auth_info_str === null) {
    return null
  }

  const auth_info_prim: unknown = JSON.parse(
    auth_info_str,
    (_1, val: unknown) => {
      // Transform the serialized Buffers back into the correct Buffer view.
      if (
        val !== null &&
        typeof val === 'object' &&
        'type' in val &&
        val.type === 'Buffer' &&
        'data' in val &&
        Array.isArray(val.data)
      ) {
        return Buffer.from(val.data)
      } else {
        return val
      }
    }
  )

  if (!SessionCredT.guard(auth_info_prim)) {
    console.log("session cred doesn't match expected format:")
    console.log(auth_info_prim)
    window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY)
    return null
  }

  const { token, ...auth_info_no_token } = { ...auth_info_prim }

  return {
    token: Buffer.from(token),
    ...auth_info_no_token,
  }
}

function setStorageAuthInfo(session_cred: SessionCred): void {
  window.sessionStorage.setItem(
    STORAGE_AUTH_INFO_KEY,
    JSON.stringify(session_cred)
  )
}

function clearStorageAuthInfo(): void {
  window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY)
}

interface RegisterComponentProps {
  register_fn: (register_info: RegisterInfo) => void
}

export function RegisterComponent(props: RegisterComponentProps) {
  const [username, setUsername] = React.useState<string>('')
  const [password, setPassword] = React.useState<string>('')
  const [email, setEmail] = React.useState<string>('')

  return (
    <div>
      <input
        value={username}
        onChange={(change_event) => {
          setUsername(change_event.target.value)
        }}
      />
      <input
        type='password'
        value={password}
        onChange={(change_event) => {
          setPassword(change_event.target.value)
        }}
      />
      <input
        value={email}
        onChange={(change_event) => {
          setEmail(change_event.target.value)
        }}
      />
      <button
        onClick={() => {
          if (username.length > 0 && password.length > 0) {
            props.register_fn({
              username: username,
              password: password,
              email: email,
            })
          }
        }}
      >
        Register
      </button>
    </div>
  )
}

interface LoginComponentProps {
  to_register_fn: () => void
  login_fn: (login_cred: LoginCred) => void
}

export function LoginComponent(props: LoginComponentProps) {
  const [username, setUsername] = React.useState<string>('')
  const [password, setPassword] = React.useState<string>('')

  return (
    <div>
      <input
        value={username}
        onChange={(change_event) => {
          setUsername(change_event.target.value)
        }}
      />
      <input
        type='password'
        value={password}
        onChange={(change_event) => {
          setPassword(change_event.target.value)
        }}
      />
      <button
        onClick={() => {
          props.login_fn({ username: username, password: password })
        }}
      >
        Log in
      </button>
      <button onClick={props.to_register_fn}>Register</button>
    </div>
  )
}

interface UserComponentProps {
  username: string
  logout_fn: () => void
}

export function UserComponent(props: UserComponentProps) {
  return (
    <div>
      <div>{props.username}</div>
      <button onClick={props.logout_fn}>Log out</button>
    </div>
  )
}

interface SessionComponentProps {
  socket: LoRDraftClientSocket
}

const enum SessionState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  SIGNED_IN = 'SIGNED_IN',
}

export function SessionComponent(props: SessionComponentProps) {
  const [username, setUsername] = React.useState<string | null>(null)
  const [sessionState, setSessionState] = React.useState<SessionState>(
    SessionState.LOGIN
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const machine_def = {
    [SessionState.LOGIN]: {
      [SessionState.REGISTER]: () => {
        console.log('login -> register')
      },
      [SessionState.SIGNED_IN]: (session_cred: SessionCred) => {
        console.log('login -> signed in')
        console.log('saving token to session storage')
        setStorageAuthInfo(session_cred)
        setUsername(session_cred.username)
      },
    },
    [SessionState.REGISTER]: {
      [SessionState.LOGIN]: () => {
        console.log('register -> login')
      },
    },
    [SessionState.SIGNED_IN]: {
      [SessionState.LOGIN]: () => {
        console.log('signed in -> login')
        clearStorageAuthInfo()
        setUsername(null)
      },
    },
  } as const

  const session_state_machine = new StateMachine(
    machine_def,
    sessionState,
    setSessionState
  )

  const socket = props.socket

  if (username === null) {
    const auth_info = getStorageAuthInfo()
    if (auth_info !== null) {
      socket.call('join_session', auth_info, (status, session_cred) => {
        if (!isOk(status) || session_cred === null) {
          if (sessionState === SessionState.LOGIN) {
            console.log('failed to join session')
            console.log(status)
            console.log('clearing token session storage')
            clearStorageAuthInfo()
          }
          return
        }
        session_cred.token = Buffer.from(session_cred.token)

        console.log('joined session')
        session_state_machine.transition(
          SessionState.LOGIN,
          SessionState.SIGNED_IN,
          session_cred
        )
      })
    }
  }

  switch (sessionState) {
    case SessionState.REGISTER: {
      return (
        <RegisterComponent
          register_fn={(register_info) => {
            socket.call('register', register_info, (status) => {
              if (!isOk(status)) {
                console.log(status)
                return
              }

              console.log('registered!')
              session_state_machine.transition(
                SessionState.REGISTER,
                SessionState.LOGIN
              )
            })
          }}
        />
      )
    }
    case SessionState.LOGIN: {
      const login = (login_cred: LoginCred) => {
        socket.call('login', login_cred, (status, session_cred) => {
          if (!isOk(status) || session_cred === null) {
            console.log(status)
            return
          }
          session_cred.token = Buffer.from(session_cred.token)

          console.log('logged in!')
          session_state_machine.transition(
            SessionState.LOGIN,
            SessionState.SIGNED_IN,
            session_cred
          )
        })
      }

      return (
        <LoginComponent
          to_register_fn={() => {
            session_state_machine.transition(
              SessionState.LOGIN,
              SessionState.REGISTER as const
            )
          }}
          login_fn={login}
        />
      )
    }
    case SessionState.SIGNED_IN: {
      const logout = () => {
        const auth_info = getStorageAuthInfo()
        if (auth_info !== null) {
          socket.call('logout', auth_info, (status) => {
            if (!isOk(status)) {
              console.log(status)
              return
            }

            console.log('logged out!')
            session_state_machine.transition(
              SessionState.SIGNED_IN,
              SessionState.LOGIN
            )
          })
        }
      }

      const auth_info = getStorageAuthInfo()

      return (
        <UserComponent
          username={auth_info?.username ?? ''}
          logout_fn={logout}
        />
      )
    }
  }
}
