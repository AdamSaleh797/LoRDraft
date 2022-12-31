import http from 'http'
import { Server } from 'socket.io'

import { loadSetPack } from './set_packs'
import { LoRDraftServer, LoRDraftSocket } from 'socket-msgs'
import { isCollectable } from './set_packs'
import { Card } from 'card'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (socket: LoRDraftSocket) => {
    console.log('a user connected')

    socket.on('card_req', (name?: string) => {
      if (name === undefined) {
        console.log('Received bad request!')
      } else {
        console.log(`Received request for card ${name}`)

        const sets = [
          'set1-en_us.json',
          'set2-en_us.json',
          'set3-en_us.json',
          'set4-en_us.json',
          'set5-en_us.json',
          'set6-en_us.json',
          'set6cde-en_us.json',
        ]

        Promise.all(
          sets.map((set) => {
            return new Promise<Card[]>((resolve, reject) => {
              const cards: Card[] = []
              loadSetPack(set, (err, cards) => {
                console.log('crumbdy')
                if (err || !cards) {
                  console.log(err)
                  reject(err)
                  console.log('rejected')
                  return
                }
                cards.forEach((card) => {
                  if (isCollectable(card)) {
                    cards.push(card)
                    console.log(card)
                  }
                })
                resolve(cards)
              })
            })
          })
        ).then((cards) => {
          let superCards: Card[] = []
          cards.forEach((c) => {
            superCards = superCards.concat(c)
          })

          console.log('printlast')
          const card = superCards.find((card) => card.name === name)
          if (card === undefined) {
            console.log('this one has a reasonable name')
            console.log(superCards[0])
            socket.emit('card_res', Error('No such card with that name!'))
            return
          }

          socket.emit('card_res', undefined, card)
        })
      }
    })
  })
}
