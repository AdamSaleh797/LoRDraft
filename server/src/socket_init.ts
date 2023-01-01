import http from 'http'
import { Server } from 'socket.io'

import { allCards } from './set_packs'
import { LoRDraftServer, LoRDraftSocket } from 'socket-msgs'
import { init_auth } from './auth'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (socket: LoRDraftSocket) => {
    console.log('a user connected')

    init_auth(socket)

    socket.on('card_req', (name?: string) => {
      if (name === undefined) {
        console.log('Received bad request!')
      } else {
        console.log(`Received request for card ${name}`)

        allCards((err, cards) => {
          if (err || !cards) {
            socket.emit('card_res', Error('Failed to load cards'))
            return
          }

          const card = cards.find((card) => card.name === name)
          if (card === undefined) {
            socket.emit('card_res', Error('No such card with that name!'))
            return
          }

          socket.emit('card_res', undefined, card)
        })
      }
    })
  })
}
