import { Server, Socket } from 'socket.io'
import { Socket as ClientSocket } from 'socket.io-client'

import { Card } from 'card'
import { Empty } from 'lor_util'

export interface ClientAuth {
  token?: string[]
}

export interface ServerToClientEvents {
  card_res: (err?: Error, card?: Card) => void
}

export interface ClientToServerEvents {
  card_req: (name?: string) => void
}

export type InterServerEvents = Empty

export type SocketData = Empty

export type LoRDraftServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type LoRDraftSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type LoRDraftClientSocket = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>
