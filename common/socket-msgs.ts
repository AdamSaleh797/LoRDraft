import { Buffer } from 'buffer'
import { Array, InstanceOf, Record, Static, String } from 'runtypes'
import { Server, Socket as ServerSocket } from 'socket.io'
import { Socket as ClientSocket } from 'socket.io-client'

import { AsyncSocketContext } from 'async_socket'
import { Card, CardT, RegionT } from 'card'
import { Empty, Status } from 'lor_util'

export const DraftDeckT = Record({
  regions: Array(RegionT),
  cards: Array(CardT),
})

export type DraftDeck = Static<typeof DraftDeckT>

export const RegisterInfoT = Record({
  username: String,
  password: String,
  email: String,
})

export type RegisterInfo = Static<typeof RegisterInfoT>

export const LoginCredT = Record({
  username: String,
  password: String,
})

export type LoginCred = Static<typeof LoginCredT>

export const SessionCredT = Record({
  username: String,
  token: InstanceOf(Buffer),
})

export type SessionCred = Static<typeof SessionCredT>

export interface ServerToClientEvents {
  register_res: (status: Status) => void
  login_res: (status: Status, session_cred: SessionCred | null) => void
  join_session_res: (status: Status, session_cred: SessionCred | null) => void
  logout_res: (status: Status) => void
  card_res: (status: Status, card: Card | null) => void
  join_draft_res: (status: Status) => void
  initial_selection_res: (status: Status, champs: Card[] | null) => void
  current_draft_res: (status: Status, draft_deck: DraftDeck | null) => void
}

export interface ClientToServerEvents {
  register_req: (register_info?: RegisterInfo) => void
  login_req: (login_cred?: LoginCred) => void
  join_session_req: (session_cred?: SessionCred) => void
  logout_req: (session_cred?: SessionCred) => void
  card_req: (name?: string) => void
  join_draft_req: (session_cred?: SessionCred) => void
  initial_selection_req: (session_cred?: SessionCred) => void
  current_draft_req: (session_cred?: SessionCred) => void
}

export type InterServerEvents = Empty

export type SocketData = Empty

export type LoRDraftServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type LoRDraftSocketIO = ServerSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type LoRDraftSocket = AsyncSocketContext<
  ClientToServerEvents,
  ServerToClientEvents
>

export type LoRDraftClientSocketIO = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>

export type LoRDraftClientSocket = AsyncSocketContext<
  ServerToClientEvents,
  ClientToServerEvents
>
