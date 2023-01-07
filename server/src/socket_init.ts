import http from 'http'
import { Server } from 'socket.io'

import { LoRDraftServer, LoRDraftSocketIO } from 'socket-msgs'
import { init_auth } from './auth'
import { AsyncSocketContext } from 'async_socket'
import { initDraftState } from './draft_state'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (io_socket: LoRDraftSocketIO) => {
    const socket = new AsyncSocketContext(io_socket)
    init_auth(socket)
    initDraftState(socket)
  })
}
