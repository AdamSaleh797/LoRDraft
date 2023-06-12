import http from 'http'
import { Server } from 'socket.io'

import {
  LoRDraftServer,
  LoRDraftSocket,
  LoRDraftSocketIO,
} from 'common/game/socket-msgs'
import { AsyncSocketContext } from 'common/util/async_socket'
import { isOk } from 'common/util/status'

import { init_auth, join_session } from 'server/auth'
import { gameMetadata } from 'server/core_bundle'
import { initDraftState } from 'server/draft_state'

function initStaticMessages(socket: LoRDraftSocket) {
  socket.respond('game_metadata', (resolve, session_cred) => {
    join_session(session_cred, (auth_user) => {
      if (!isOk(auth_user)) {
        resolve(auth_user)
      } else {
        gameMetadata(resolve)
      }
    })
  })
}

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (io_socket: LoRDraftSocketIO) => {
    const socket = new AsyncSocketContext(io_socket)
    init_auth(socket)
    initDraftState(socket)
    initStaticMessages(socket)
  })
}
