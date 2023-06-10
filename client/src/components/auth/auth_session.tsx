import React from 'react'

import { Buffer } from 'buffer'
import {
  LoginCred,
  LoRDraftClientSocket,
  RegisterInfo,
  SessionCred,
} from 'socket-msgs'
import { isOk, Status, StatusCode } from 'lor_util'
import { StateMachine } from 'state_machine'
import { Button } from '../button/button'
import { APP_TITLE } from '../../utils/constants'

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
      <Button
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
      </Button>
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
      <Button
        onClick={() => {
          props.login_fn({ username: username, password: password })
        }}
      >
        Log in
      </Button>
      <Button onClick={props.to_register_fn}>Register</Button>
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
      <div>
        You are logged in as <b>{props.username}</b>
      </div>
      <Button onClick={props.logout_fn}>Log out</Button>
    </div>
  )
}

interface SessionComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred | null
  setAuthInfo: (auth_info: SessionCred) => void
  clearAuthInfo: () => void
  refreshDraft: (
    session_cred: SessionCred,
    callback: (status: Status) => void
  ) => void
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
  const refreshDraftRef = React.useRef<typeof props.refreshDraft>(
    props.refreshDraft
  )
  refreshDraftRef.current = props.refreshDraft

  const machine_def = {
    [SessionState.LOGIN]: {
      [SessionState.REGISTER]: () => {
        console.log('login -> register')
      },
      [SessionState.SIGNED_IN]: (session_cred: SessionCred) => {
        console.log('login -> signed in')
        console.log('saving token to session storage')
        props.setAuthInfo(session_cred)
        setUsername(session_cred.username)

        // Attempt to load the current draft. Ignore failures, since this is
        // likely due to a current draft not existing.
        refreshDraftRef.current(session_cred, () => undefined)
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
        props.clearAuthInfo()
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
    if (props.authInfo !== null) {
      socket.call('join_session', props.authInfo, (status, session_cred) => {
        if (!isOk(status) || session_cred === null) {
          if (sessionState === SessionState.LOGIN) {
            console.log('failed to join session')
            console.log(status)
            console.log('clearing token session storage')
            props.clearAuthInfo()
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

      const auto_login = () => {
        const username = 'test'
        const password = 'test'
        const email = 'test@mail.com'

        const trans_status = session_state_machine.transition(
          SessionState.LOGIN,
          SessionState.REGISTER as const
        )
        if (!isOk(trans_status)) {
          console.log(trans_status)
          return
        }

        socket.call(
          'register',
          { username: username, password: password, email: email },
          (status) => {
            if (
              !isOk(status) &&
              status.status !== StatusCode.USER_ALREADY_EXISTS
            ) {
              console.log(status)
              return
            }

            session_state_machine.transition(
              SessionState.REGISTER,
              SessionState.LOGIN
            )

            socket.call(
              'login',
              { username: username, password: password },
              (status, session_cred) => {
                if (!isOk(status) || session_cred === null) {
                  console.log(status)
                  return
                }
                session_cred.token = Buffer.from(session_cred.token)

                session_state_machine.transition(
                  SessionState.LOGIN,
                  SessionState.SIGNED_IN,
                  session_cred
                )
              }
            )
          }
        )
      }

      return (
        <div>
          <p>You need an Account to use {APP_TITLE}</p>
          <Button onClick={auto_login}>Auto login</Button>
          <LoginComponent
            to_register_fn={() => {
              session_state_machine.transition(
                SessionState.LOGIN,
                SessionState.REGISTER as const
              )
            }}
            login_fn={login}
          />
        </div>
      )
    }
    case SessionState.SIGNED_IN: {
      const logout = () => {
        if (props.authInfo !== null) {
          socket.call('logout', props.authInfo, (status) => {
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

      return (
        <UserComponent
          username={props.authInfo?.username ?? ''}
          logout_fn={logout}
        />
      )
    }
  }
}
