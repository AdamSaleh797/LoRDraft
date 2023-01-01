import { InstanceOf, Record, String } from 'runtypes'
import { Server, Socket } from 'socket.io'
import { Socket as ClientSocket } from 'socket.io-client'

import { Card } from 'card'
import { Empty, Status } from 'lor_util'

export interface LoginCred {
  username: string
  password: string
}

export const LoginCredT = Record({
  username: String,
  password: String,
})

export interface SessionCred {
  username: string
  token: Buffer
}

export const SessionCredT = Record({
  username: String,
  token: InstanceOf(Buffer),
})

export interface ServerToClientEvents {
  login_res: (status: Status, session_cred?: SessionCred) => void
  join_session_res: (status: Status, session_cred?: SessionCred) => void
  logout_res: (status: Status) => void
  card_res: (err?: Error, card?: Card) => void
}

export interface ClientToServerEvents {
  login_req: (login_cred?: LoginCred) => void
  join_session_req: (session_cred?: SessionCred) => void
  logout_req: (session_cred?: SessionCred) => void
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
