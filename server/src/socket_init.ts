import http from 'http'
import { Server } from 'socket.io'

import { loadSetPack } from './set_packs'
import { LoRDraftServer, LoRDraftSocket } from 'socket-msgs'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (socket: LoRDraftSocket) => {
    console.log('a user connected')

    socket.on('card_req', (name?: string) => {
      if (name === undefined) {
        console.log('Received bad request!')
      } else {
        console.log(`Received request for card ${name}`)

        loadSetPack('set1-en_us.json', (err, cards) => {
          if (err !== null || cards === null) {
            socket.emit(
              'card_res',
              Error('Failed to load the set pack. Sorry client!')
            )
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
