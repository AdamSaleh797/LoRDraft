import { Record, Static, String } from 'runtypes';
import { Array as ArrayT } from 'runtypes';
import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';

import { Card, CardT } from 'common/game/card';
import { DraftStateInfo } from 'common/game/draft';
import { DraftOptions } from 'common/game/draft_options';
import { GameMetadata } from 'common/game/metadata';
import { AsyncSocketContext } from 'common/util/async_socket';
import { Empty } from 'common/util/lor_util';
import { Status } from 'common/util/status';

export const RegisterInfoT = Record({
  username: String,
  password: String,
  email: String,
});

export type RegisterInfo = Static<typeof RegisterInfoT>;

export const LoginCredT = Record({
  username: String,
  password: String,
});

export type LoginCred = Static<typeof LoginCredT>;

export const AuthInfoT = Record({
  username: String,
  token: String,
});

export type AuthInfo = Static<typeof AuthInfoT>;

export const CardListT = ArrayT(CardT).asReadonly();

export interface ServerToClientEvents {
  /* eslint-disable @typescript-eslint/naming-convention */
  register_res: (status: Status) => void;
  login_res: (session_cred: Status<AuthInfo>) => void;
  join_session_res: (session_cred: Status<AuthInfo>) => void;
  logout_res: (status: Status) => void;
  game_metadata_res: (metadata: Status<GameMetadata>) => void;
  join_draft_res: (status: Status<DraftStateInfo>) => void;
  close_draft_res: (status: Status) => void;
  current_draft_res: (draft_state_info: Status<DraftStateInfo>) => void;
  choose_cards_res: (draft_state_info: Status<DraftStateInfo>) => void;
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface ClientToServerEvents {
  /* eslint-disable @typescript-eslint/naming-convention */
  register_req: (register_info?: RegisterInfo) => void;
  login_req: (login_cred?: LoginCred) => void;
  join_session_req: (session_cred?: AuthInfo) => void;
  logout_req: (session_cred?: AuthInfo) => void;
  game_metadata_req: (session_cred?: AuthInfo) => void;
  join_draft_req: (
    session_cred?: AuthInfo,
    draft_options?: DraftOptions
  ) => void;
  close_draft_req: (session_cred?: AuthInfo) => void;
  current_draft_req: (session_cred?: AuthInfo) => void;
  choose_cards_req: (session_cred?: AuthInfo, cards?: Card[]) => void;
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type InterServerEvents = Empty;

export type SocketData = Empty;

export type LoRDraftServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type LoRDraftSocketIO = ServerSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type LoRDraftSocket = AsyncSocketContext<
  ClientToServerEvents,
  ServerToClientEvents
>;

export type LoRDraftClientSocketIO = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>;

export type LoRDraftClientSocket = AsyncSocketContext<
  ServerToClientEvents,
  ClientToServerEvents
>;
