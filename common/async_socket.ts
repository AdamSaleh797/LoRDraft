import { io as io_client } from 'socket.io-client'
import { Socket } from 'socket.io'
import { gen_uuid, Status } from 'lor_util'

export interface EventsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: any
}
type EventNames<Map extends EventsMap> = keyof Map & string

type ToReqEventName<EmitEventName extends string> = `${EmitEventName}_req`
type ToResEventName<EmitEventName extends string> = `${EmitEventName}_res`

declare type ToRequestEvents<EmitEvents extends EventsMap> = {
  [Ev in keyof EmitEvents as Ev extends `${infer T}_req`
    ? T & string
    : never]: (uuid: string, ...data: Parameters<EmitEvents[Ev]>) => void
}

declare type ToResponseEvents<EmitEvents extends EventsMap> = {
  [Ev in keyof EmitEvents as Ev extends `${infer T}_res`
    ? T & string
    : never]: (uuid: string, ...data: Parameters<EmitEvents[Ev]>) => void
}

interface AsyncMessage {
  uuid: string
  callback: (status: Status) => void
}

export class AsyncSocketContext<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap,
  ServerSideEvents extends EventsMap,
  SocketData
> {
  readonly socket: Socket<
    ListenEvents,
    ToRequestEvents<EmitEvents>,
    ServerSideEvents,
    SocketData
  >
  // A map from message names to the listeners bound to those messages.
  readonly listeners: Map<string, () => void>
  readonly outstanding_calls: Map<string, AsyncMessage>

  constructor(
    socket: Socket<
      ListenEvents,
      ToRequestEvents<EmitEvents>,
      ServerSideEvents,
      SocketData
    >
  ) {
    this.socket = socket
    this.listeners = new Map()
    this.outstanding_calls = new Map()
  }

  // TODO write the listeners
  // private _callback(event: string): () => void {
  //   if (!this.listeners.has(event)) {
  //     const cb = () => {
  //       return
  //     }
  //     this.listeners.set(event, cb)
  //     return cb
  //   } else {
  //     return this.listeners.get(event) ?? (0 as never)
  //   }
  // }

  do_call<
    EmitEventName extends EventNames<ToRequestEvents<EmitEvents>> &
      EventNames<ToResponseEvents<ListenEvents>>
  >(
    event_name: EmitEventName,
    callback: (
      socket_status: Status,
      ...args: Parameters<ListenEvents[ToResEventName<EmitEventName>]>
    ) => void,
    ...call_args: Parameters<EmitEvents[ToReqEventName<EmitEventName>]>
  ): void {
    const uuid = gen_uuid()
    // Disappointing, but this seems to be a limitation in the typescript type checker
    // (https://stackoverflow.com/questions/72704929/typescript-wrong-typechecking-when-remapping-keys-with-as-combined-with-generi)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.socket.emit as any)(event_name, uuid, ...call_args)
  }
}
