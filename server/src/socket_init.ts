import http from 'http'
import { Server } from 'socket.io'

import { LoRDraftServer, LoRDraftSocket } from 'socket-msgs'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (socket: LoRDraftSocket) => {
    console.log('a user connected')

    socket.emit('card', 'Spiderling')
  })
}
