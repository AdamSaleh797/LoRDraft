import http from 'http'
import { Server } from 'socket.io'

import {
  LoRDraftServer,
  LoRDraftSocket,
  LoRDraftSocketIO,
} from 'game/socket-msgs'
import { AsyncSocketContext } from 'util/async_socket'
import { isOk } from 'util/status'

import { init_auth, join_session } from './auth'
import { gameMetadata } from './core_bundle'
import { initDraftState } from './draft_state'

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
