import { Buffer } from 'buffer'
import { InstanceOf, Record, Static, String } from 'runtypes'
import { Server, Socket as ServerSocket } from 'socket.io'

import { Socket as ClientSocket } from 'socket.io-client'

import { Card } from 'game/card'
import { DraftStateInfo } from 'game/draft'
import { DraftOptions } from 'game/draft_options'
import { GameMetadata } from 'game/metadata'
import { AsyncSocketContext } from 'util/async_socket'
import { Empty } from 'util/lor_util'
import { Status } from 'util/status'

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
  login_res: (session_cred: Status<SessionCred>) => void
  join_session_res: (session_cred: Status<SessionCred>) => void
  logout_res: (status: Status) => void
  game_metadata_res: (metadata: Status<GameMetadata>) => void
  join_draft_res: (status: Status<DraftStateInfo>) => void
  close_draft_res: (status: Status) => void
  current_draft_res: (draft_state_info: Status<DraftStateInfo>) => void
  choose_cards_res: (draft_state_info: Status<DraftStateInfo>) => void
}

export interface ClientToServerEvents {
  register_req: (register_info?: RegisterInfo) => void
  login_req: (login_cred?: LoginCred) => void
  join_session_req: (session_cred?: SessionCred) => void
  logout_req: (session_cred?: SessionCred) => void
  game_metadata_req: (session_cred?: SessionCred) => void
  join_draft_req: (
    session_cred?: SessionCred,
    draft_options?: DraftOptions
  ) => void
  close_draft_req: (session_cred?: SessionCred) => void
  current_draft_req: (session_cred?: SessionCred) => void
  choose_cards_req: (session_cred?: SessionCred, cards?: Card[]) => void
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
