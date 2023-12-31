import io from 'socket.io-client';

import {
  LoRDraftClientSocket,
  LoRDraftClientSocketIO,
} from 'common/game/socket-msgs';
import { AsyncSocketContext } from 'common/util/async_socket';

export function createLoRSocket(): LoRDraftClientSocket {
  return new AsyncSocketContext(
    io({
      transports: ['websocket', 'polling'],
    }) as LoRDraftClientSocketIO,
    /*verbose=*/ true
  );
}
