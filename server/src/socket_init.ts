import http from 'http'
import { Server } from 'socket.io'

import { allCards } from './set_packs'
import { LoRDraftServer, LoRDraftSocketIO } from 'socket-msgs'
import { init_auth } from './auth'
import { AsyncSocketContext } from 'async_socket'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (io_socket: LoRDraftSocketIO) => {
    const socket = new AsyncSocketContext(io_socket)
    init_auth(socket)

    socket.respond('card', (resolve, name) => {
      if (name === undefined) {
        console.log('Received bad request!')
      } else {
        allCards((err, cards) => {
          if (err || !cards) {
            resolve(Error('Failed to load cards'), null)
            return
          }

          const card = cards.find((card) => card.name === name)
          if (card === undefined) {
            resolve(Error('No such card with that name!'), null)
            return
          }

          resolve(null, card)
        })
      }
    })
  })
}
