import React from 'react'

import { Buffer } from 'buffer'
import { LoRDraftClientSocket, SessionCred, SessionCredT } from 'socket-msgs'
import { isOk } from 'lor_util'

const STORAGE_AUTH_INFO_KEY = 'auth_info'

function getStorageAuthInfo(): SessionCred | null {
  const auth_info_str = window.sessionStorage.getItem(STORAGE_AUTH_INFO_KEY)
  if (auth_info_str === null) {
    return null
  }

  const auth_info_prim: unknown = JSON.parse(
    auth_info_str,
    (_1, val: unknown) => {
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
  console.log((auth_info_prim as SessionCred).token)
  SessionCredT.check(auth_info_prim)
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
    JSON.stringify(session_cred)
  )
  console.log(JSON.stringify(session_cred))
}

function clearStorageAuthInfo(): void {
  window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY)
}

interface LoginComponentProps {
  login_fn: () => void
}

export function LoginComponent(props: LoginComponentProps) {
  return (
    <div>
      <button onClick={props.login_fn}>Log in/Sign up</button>
    </div>
  )
}

interface UserComponentProps {
  username: string
}

export function UserComponent(props: UserComponentProps) {
  return <div>{props.username}</div>
}

interface SessionComponentProps {
  socket: LoRDraftClientSocket
}

export function SessionComponent(props: SessionComponentProps) {
  const [username, setUsername] = React.useState<string | null>(null)

  const socket = props.socket

  React.useEffect(() => {
    socket.on('login_res', (status, session_cred) => {
      console.log(status)
      console.log(session_cred)

      if (isOk(status) && session_cred !== undefined) {
        // Explicitly convert token to a buffer, as it is actually deserialized as an ArrayBuffer.
        session_cred.token = Buffer.from(session_cred.token)
        console.log('saving token to session storage')
        setStorageAuthInfo(session_cred)
        setUsername(session_cred.username)
      }
    })

    socket.on('join_session_res', (status, session_cred) => {
      console.log('joined session')
      console.log(status)

      if (isOk(status) && session_cred !== undefined) {
        setUsername(session_cred.username)
      } else {
        console.log('clearing token session storage')
        clearStorageAuthInfo()
      }
    })

    socket.on('logout_res', (status) => {
      console.log('logout response:')
      console.log(status)

      clearStorageAuthInfo()
    })
  }, [])

  if (username === null) {
    const auth_info = getStorageAuthInfo()
    if (auth_info !== null) {
      socket.emit('join_session_req', auth_info)
    }
  }

  if (username !== null) {
    return <UserComponent username={username} />
  } else {
    const login = () => {
      console.log('click!')
      socket.emit('login_req', { username: 'clayton', password: 'test_pw' })
    }

    return <LoginComponent login_fn={login} />
  }
}
