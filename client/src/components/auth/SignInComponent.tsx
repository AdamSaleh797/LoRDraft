import React from 'react'

import {
  LoRDraftClientSocket,
  LoginCred,
  RegisterInfo,
} from 'common/game/socket-msgs'
import { StatusCode, isOk } from 'common/util/status'

import { Button } from 'client/components/common/button'
import { useLoRDispatch } from 'client/store/hooks'
import { doLoginAsync, doRegisterAsync } from 'client/store/session'
import { APP_TITLE } from 'client/utils/constants'

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

// interface UserComponentProps {
//   username: string
//   logout_fn: () => void
// }

// export function UserComponent(props: UserComponentProps) {
//   return (
//     <div>
//       <div>
//         You are logged in as <b>{props.username}</b>
//       </div>
//       <Button onClick={props.logout_fn}>Log out</Button>
//     </div>
//   )
// }

interface SessionComponentProps {
  socket: LoRDraftClientSocket
}

export const enum SignInState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
}

export function SignInComponent(props: SessionComponentProps) {
  const [signInState, setSignInState] = React.useState<SignInState>(
    SignInState.LOGIN
  )
  const dispatch = useLoRDispatch()

  // const machine_def = {
  //   [SessionState.LOGIN]: {
  //     [SessionState.REGISTER]: (_: LoginState) => {
  //       console.log('login -> register')
  //       return {}
  //     },
  //     [SessionState.SIGNED_IN]: (_: LoginState, session_cred: SessionCred) => {
  //       console.log('login -> signed in')
  //       console.log('saving token to session storage')
  //       props.setAuthInfo(session_cred)

  //       return {
  //         username: session_cred.username,
  //       }
  //     },
  //   },
  //   [SessionState.REGISTER]: {
  //     [SessionState.LOGIN]: (_: RegisterState) => {
  //       console.log('register -> login')
  //       return {}
  //     },
  //   },
  //   [SessionState.SIGNED_IN]: {
  //     [SessionState.LOGIN]: (_: SignedInState) => {
  //       console.log('signed in -> login')
  //       props.clearAuthInfo()
  //       return {}
  //     },
  //   },
  // } as const

  const socket = props.socket

  // TODO replicate this logic higher up the app
  // if (props.authInfo !== null && sessionState !== SessionState.SIGNED_IN) {
  //   socket.call('join_session', props.authInfo, (status) => {
  //     if (!isOk(status)) {
  //       if (sessionState === SessionState.LOGIN) {
  //         console.log('failed to join session')
  //         console.log(status)
  //         console.log('clearing token session storage')
  //         props.clearAuthInfo()
  //       }
  //       return
  //     }
  //     const session_cred = status.value
  //     session_cred.token = Buffer.from(session_cred.token)

  //     console.log('joined session')
  //     session_state_machine.transition(
  //       SessionState.LOGIN,
  //       SessionState.SIGNED_IN,
  //       session_cred
  //     )
  //   })
  // }

  switch (signInState) {
    case SignInState.REGISTER: {
      return (
        <RegisterComponent
          register_fn={(register_info) => {
            dispatch(doRegisterAsync({ socket, register_info }))
            setSignInState(SignInState.LOGIN)
          }}
        />
      )
    }
    case SignInState.LOGIN: {
      const login_fn = (login_cred: LoginCred) => {
        dispatch(doLoginAsync({ socket, login_info: login_cred }))
      }

      const auto_login = () => {
        const username = 'test'
        const password = 'test'
        const email = 'test@mail.com'

        dispatch(
          doRegisterAsync({
            socket,
            register_info: { username, password, email },
            callback: (status) => {
              if (
                !isOk(status) &&
                status.status !== StatusCode.USER_ALREADY_EXISTS
              ) {
                console.log(status)
                return
              }

              dispatch(
                doLoginAsync({ socket, login_info: { username, password } })
              )
            },
          })
        )
      }

      return (
        <div>
          <p>You need an Account to use {APP_TITLE}</p>
          <Button onClick={auto_login}>Auto login</Button>
          <LoginComponent
            to_register_fn={() => {
              setSignInState(SignInState.REGISTER)
            }}
            login_fn={login_fn}
          />
        </div>
      )
    }
    // case SessionState.SIGNED_IN: {
    //   const status = session_state_machine.state_prop_exact(
    //     SessionState.SIGNED_IN
    //   )
    //   if (!isOk(status)) {
    //     console.log(status)
    //     return <div></div>
    //   }
    //   const signed_in_state = status.value

    //   const logout = () => {
    //     if (props.authInfo !== null) {
    //       socket.call('logout', props.authInfo, (status) => {
    //         if (!isOk(status)) {
    //           console.log(status)
    //           return
    //         }

    //         console.log('logged out!')
    //         session_state_machine.transition(
    //           SessionState.SIGNED_IN,
    //           SessionState.LOGIN
    //         )
    //       })
    //     }
    //   }

    //   return (
    //     <UserComponent username={signed_in_state.username} logout_fn={logout} />
    //   )
    // }
  }
}
