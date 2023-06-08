import React from 'react'

import { Buffer } from 'buffer'
import {
  LoginCred,
  LoRDraftClientSocket,
  RegisterInfo,
  SessionCred,
} from 'game/socket-msgs'
import { isOk, Status, StatusCode } from 'util/status'
import { StateMachine } from 'util/state_machine'
import { Empty } from 'util/lor_util'

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

type LoginState = Empty
type RegisterState = Empty
interface SignedInState {
  username: string
}

export function SessionComponent(props: SessionComponentProps) {
  const [sessionState, setSessionState] = React.useState<SessionState>(
    SessionState.LOGIN
  )
  const refreshDraftRef = React.useRef<typeof props.refreshDraft>(
    props.refreshDraft
  )
  refreshDraftRef.current = props.refreshDraft

  const machine_def = {
    [SessionState.LOGIN]: {
      [SessionState.REGISTER]: (_: LoginState) => {
        console.log('login -> register')
        return {}
      },
      [SessionState.SIGNED_IN]: (_: LoginState, session_cred: SessionCred) => {
        console.log('login -> signed in')
        console.log('saving token to session storage')
        props.setAuthInfo(session_cred)

        // Attempt to load the current draft. Ignore failures, since this is
        // likely due to a current draft not existing.
        refreshDraftRef.current(session_cred, () => undefined)

        return {
          username: session_cred.username,
        }
      },
    },
    [SessionState.REGISTER]: {
      [SessionState.LOGIN]: (_: RegisterState) => {
        console.log('register -> login')
        return {}
      },
    },
    [SessionState.SIGNED_IN]: {
      [SessionState.LOGIN]: (_: SignedInState) => {
        console.log('signed in -> login')
        props.clearAuthInfo()
        return {}
      },
    },
  } as const

  const session_state_machine = StateMachine.makeStateMachine(
    machine_def,
    sessionState,
    {} as Empty,
    setSessionState as (_: SessionState) => void
  )

  const socket = props.socket

  if (props.authInfo !== null && sessionState !== SessionState.SIGNED_IN) {
    socket.call('join_session', props.authInfo, (status) => {
      if (!isOk(status)) {
        if (sessionState === SessionState.LOGIN) {
          console.log('failed to join session')
          console.log(status)
          console.log('clearing token session storage')
          props.clearAuthInfo()
        }
        return
      }
      const session_cred = status.value
      session_cred.token = Buffer.from(session_cred.token)

      console.log('joined session')
      session_state_machine.transition(
        SessionState.LOGIN,
        SessionState.SIGNED_IN,
        session_cred
      )
    })
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
        socket.call('login', login_cred, (status) => {
          if (!isOk(status)) {
            console.log(status)
            return
          }
          const session_cred = status.value
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
              (status) => {
                if (!isOk(status)) {
                  console.log(status)
                  return
                }
                const session_cred = status.value
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
          <button onClick={auto_login}>Auto login</button>
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
      const status = session_state_machine.state_prop_exact(
        SessionState.SIGNED_IN
      )
      if (!isOk(status)) {
        console.log(status)
        return <div></div>
      }
      const signed_in_state = status.value

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
        <UserComponent username={signed_in_state.username} logout_fn={logout} />
      )
    }
  }
}
