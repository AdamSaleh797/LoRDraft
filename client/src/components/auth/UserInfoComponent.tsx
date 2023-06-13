import React from 'react'

import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'

import { Button } from 'client/components/common/button'
import { useLoRDispatch } from 'client/store/hooks'
import { doLogoutAsync } from 'client/store/session'

interface UserComponentProps {
  socket: LoRDraftClientSocket
  auth_info: SessionCred
}

export function UserComponent(props: UserComponentProps) {
  const dispatch = useLoRDispatch()

  return (
    <div>
      <div>
        You are logged in as <b>{props.auth_info.username}</b>
      </div>
      <Button
        onClick={() => {
          dispatch(
            doLogoutAsync({ socket: props.socket, auth_info: props.auth_info })
          )
        }}
      >
        Log out
      </Button>
    </div>
  )
}
