import React from 'react'

import { Buffer } from 'buffer'
import { LoRDraftClientSocket, SessionCred, SessionCredT } from 'socket-msgs'
import { isOk, Status } from 'lor_util'
import { StateMachine, StateMachineDef } from 'state_machine'

const STORAGE_AUTH_INFO_KEY = 'auth_info'

function getStorageAuthInfo(): SessionCred | null {
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

  const token_buffer = Buffer.from(token)

  return {
    token: token_buffer,
    ...auth_info_no_token,
  }
}

function setStorageAuthInfo(session_cred: SessionCred): void {
  window.sessionStorage.setItem(
    STORAGE_AUTH_INFO_KEY,
    JSON.stringify(session_cred, (key, val) => {
      // if (key === 'buffer') {
      //   Buffer.
      // }
      // else {
      return val
      // }
    })
  )
}

function clearStorageAuthInfo(): void {
  window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY)
}

interface RegisterComponentProps {
  register_fn: () => void
}

export function RegisterComponent(props: RegisterComponentProps) {
  return (
    <div>
      <input
        value={'clayton'}
        onChange={(evt) => {
          console.log(evt)
        }}
      />
      <button onClick={props.register_fn}>Register</button>
    </div>
  )
}

interface LoginComponentProps {
  register_fn: () => void
  login_fn: () => void
}

export function LoginComponent(props: LoginComponentProps) {
  return (
    <div>
      <button onClick={props.login_fn}>Log in</button>
      <button onClick={props.register_fn}>Register</button>
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

  const handle_register_res = React.useRef<(status: Status) => void>(
    () => undefined
  )
  const handle_login_res = React.useRef<
    (status: Status, session_cred?: SessionCred) => void
  >(() => undefined)
  const handle_join_session_res = React.useRef<
    (status: Status, session_cred?: SessionCred) => void
  >(() => undefined)
  const handle_logout_res = React.useRef<(status: Status) => void>(
    () => undefined
  )

  const session_state_machine = new StateMachine(
    machine_def,
    sessionState,
    setSessionState
  )

  handle_register_res.current = (status) => {
    if (!isOk(status)) {
      console.log(status)
      return
    }

    console.log('registered!')
    session_state_machine.transition(SessionState.REGISTER, SessionState.LOGIN)
  }

  handle_login_res.current = (status, session_cred) => {
    if (!isOk(status) || session_cred === undefined) {
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
  }

  handle_join_session_res.current = (status, session_cred) => {
    if (!isOk(status) || session_cred === undefined) {
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
  }

  handle_logout_res.current = (status) => {
    if (!isOk(status)) {
      console.log(status)
      return
    }

    console.log('logged out!')
    session_state_machine.transition(SessionState.SIGNED_IN, SessionState.LOGIN)
  }

  const socket = props.socket

  React.useEffect(() => {
    socket.on('register_res', (status) => {
      handle_register_res.current(status)
    })

    socket.on('login_res', (status, session_cred) => {
      handle_login_res.current(status, session_cred)
    })

    socket.on('join_session_res', (status, session_cred) => {
      handle_join_session_res.current(status, session_cred)
    })

    socket.on('logout_res', (status) => {
      handle_logout_res.current(status)
    })
  }, [])

  if (username === null) {
    const auth_info = getStorageAuthInfo()
    if (auth_info !== null) {
      socket.emit('join_session_req', auth_info)
    }
  }

  if (username !== null) {
    const logout = () => {
      const auth_info = getStorageAuthInfo()
      if (auth_info !== null) {
        socket.emit('logout_req', auth_info)
      }
    }

    return <UserComponent username={username} logout_fn={logout} />
  } else {
    const register = () => {
      socket.emit('register_req', {
        username: 'clayton',
        password: 'test_pw',
        email: 'cknit1999@gmail.com',
      })
    }
    const login = () => {
      socket.emit('login_req', { username: 'clayton', password: 'test_pw' })
    }

    return <LoginComponent register_fn={register} login_fn={login} />
  }
}
