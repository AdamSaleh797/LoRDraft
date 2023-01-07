import http from 'http'
import { Server } from 'socket.io'

import { regionSets } from './set_packs'
import { LoRDraftServer, LoRDraftSocketIO } from 'socket-msgs'
import { init_auth } from './auth'
import { AsyncSocketContext } from 'async_socket'
import {
  isOk,
  MakeErrStatus,
  OkStatus,
  StatusCode,
  statusSanitizeError,
} from 'lor_util'
import { allRegions, Card, ryzeOrigin } from 'card'
import { initDraftState } from './draft_state'
import util from 'util'

export function InitSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app)

  io.on('connection', (io_socket: LoRDraftSocketIO) => {
    const socket = new AsyncSocketContext(io_socket)
    init_auth(socket)
    initDraftState(socket)

    regionSets((status, regionmap) => {
      const map = new Map<string, Card>()
      if (regionmap === null) {
        return
      }
      allRegions().forEach((region) => {
        const cards = regionmap[region]
        cards.champs.forEach((champ) => {
          if (ryzeOrigin.includes(champ.name)) {
            throw new Error('unexpected champ in ryze region')
          }
        })
        cards.nonChamps.forEach((card) => {
          if (ryzeOrigin.includes(card.name)) {
            if (!map.has(card.name)) {
              map.set(card.name, card)
            } else {
              if (map.get(card.name)?.cardCode !== card.cardCode) {
                throw new Error("ryze origin doesn't match")
              }
            }
          }
        })
      })

      ryzeOrigin.forEach((card) => {
        if (!map.has(card)) {
          throw new Error(`${card} bas as fup`)
        }
      })

      console.log(
        util.inspect(
          Array.from(map.values()).map((card) => {
            return card.cardCode
          }),
          { maxArrayLength: null }
        )
      )
    })

    socket.respond('card', (resolve, name) => {
      if (name === undefined) {
        console.log('Received bad request!')
      } else {
        regionSets((status, region_sets) => {
          if (!isOk(status) || region_sets === null) {
            resolve(
              statusSanitizeError(
                status,
                StatusCode.RETRIEVE_CARD_ERROR,
                `Failed to load card ${name}`
              ),
              null
            )
            return
          }

          const card_list = allRegions()
            .map((region) => {
              return [
                ...region_sets[region].champs,
                ...region_sets[region].nonChamps,
              ]
            })
            .flat(1)
          const card = card_list.find((card) => card.name === name)
          if (card === undefined) {
            resolve(
              MakeErrStatus(
                StatusCode.UNKNOWN_CARD,
                'No such card with that name!'
              ),
              null
            )
            return
          }

          resolve(OkStatus, card)
        })
      }
    })
  })
}
