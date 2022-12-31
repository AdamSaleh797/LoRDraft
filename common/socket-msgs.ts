import { Server, Socket } from 'socket.io'
import { Socket as ClientSocket } from 'socket.io-client'

import { Card } from 'card'

export interface ServerToClientEvents {
  card: (name: string) => void
}

export interface ClientToServerEvents {
  hello: () => void
}

export type InterServerEvents = Record<string, never>

export interface SocketData {
  token?: string
}

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
