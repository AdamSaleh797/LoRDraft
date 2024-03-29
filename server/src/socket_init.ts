import http from 'http';
import { Server } from 'socket.io';

import {
  LoRDraftServer,
  LoRDraftSocket,
  LoRDraftSocketIO,
} from 'common/game/socket-msgs';
import { AsyncSocketContext } from 'common/util/async_socket';
import { isOk } from 'common/util/status';

import { config } from 'server/args';
import { initAuth, joinSession } from 'server/auth';
import { gameMetadata } from 'server/core_bundle';
import { initDraftState } from 'server/draft_state';

function initStaticMessages(socket: LoRDraftSocket) {
  socket.respond('game_metadata', async (session_cred) => {
    const auth_user = joinSession(session_cred);
    if (!isOk(auth_user)) {
      return auth_user;
    } else {
      return await gameMetadata();
    }
  });
}

export function initSocket(app: http.Server): void {
  const io: LoRDraftServer = new Server(app);

  io.on('connection', (io_socket: LoRDraftSocketIO) => {
    const socket = new AsyncSocketContext(io_socket, config.dev);
    initAuth(socket);
    initDraftState(socket);
    initStaticMessages(socket);
  });
}
