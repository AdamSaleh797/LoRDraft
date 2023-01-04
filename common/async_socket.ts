import { Socket as ClientSocket } from 'socket.io-client'
import { Socket as ServerSocket } from 'socket.io'
import { Empty, gen_uuid, OkStatus, Status } from 'lor_util'

interface EventsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: any
}

type EventNames<Map extends EventsMap> = keyof Map & string

type ToReqEventName<EmitEventName extends string> = `${EmitEventName}_req`
type ToResEventName<EmitEventName extends string> = `${EmitEventName}_res`

type ToRequestEvents<Events extends EventsMap> = {
  [Ev in keyof Events as Ev extends `${infer T}_req` ? T & string : never]: (
    uuid: string,
    ...data: Parameters<Events[Ev]>
  ) => void
}

type ToResponseEvents<Events extends EventsMap> = {
  [Ev in keyof Events as Ev extends `${infer T}_res` ? T & string : never]: (
    uuid: string,
    ...data: Parameters<Events[Ev]>
  ) => void
}

// Async compatible events are events that have a *_req form in EmitEvents and
// a *_res form in ListenEvents.
type AsyncCompatibleEvents<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap
> = EventNames<ToRequestEvents<EmitEvents>> &
  EventNames<ToResponseEvents<ListenEvents>>

type AsyncMessage<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap,
  EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>,
  Args extends Parameters<ListenEvents[ToResEventName<EventName>]>
> = (status: Status, ...args: Args) => void

export type ResponseCallbackT<
  EventName extends keyof ToResponseEvents<ListenEvents> & string,
  ListenEvents extends EventsMap
> = (
  socket_status: Status,
  ...args: Parameters<ListenEvents[ToResEventName<EventName>]>
) => void

export class AsyncSocketContext<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap
> {
  private readonly socket:
    | ServerSocket<
        ToResponseEvents<ListenEvents>,
        ToRequestEvents<EmitEvents>,
        Empty,
        Empty
      >
    | ClientSocket<ToResponseEvents<ListenEvents>, ToRequestEvents<EmitEvents>>
  // A map from message names to the listeners bound to those messages.
  private readonly listeners: Map<
    string,
    (uuid: string, ...args: never) => void
  >
  private readonly outstanding_calls: Map<
    string,
    AsyncMessage<ListenEvents, EmitEvents, never, never>
  >

  constructor(
    socket: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
      | ClientSocket<ListenEvents, EmitEvents>
  ) {
    this.socket = socket
    this.listeners = new Map()
    this.outstanding_calls = new Map()
  }

  private _init_callback<
    EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>
  >(event: EventName): void {
    type CallbackT = (
      uuid: string,
      ...call_args: Parameters<ListenEvents[ToResEventName<EventName>]>
    ) => void

    if (!this.listeners.has(event)) {
      const cb: CallbackT = (uuid, ...call_args) => {
        console.log(uuid, call_args)
        if (!this.outstanding_calls.has(uuid)) {
          console.log(`Error: received event with unknown uuid: ${uuid}`)
          return
        }

        const callback = this.outstanding_calls.get(uuid) as AsyncMessage<
          ListenEvents,
          EmitEvents,
          EventName,
          Parameters<ListenEvents[ToResEventName<EventName>]>
        >
        callback(OkStatus, ...call_args)
      }

      this.listeners.set(event, cb)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(
        this.socket.on as unknown as (
          event_name: EventName,
          callback: CallbackT
        ) => void
      )(event, cb)
    }
  }

  do_call<EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>>(
    event_name: EventName,
    callback: ResponseCallbackT<EventName, ListenEvents>,
    ...call_args: Parameters<EmitEvents[ToReqEventName<EventName>]>
  ): void {
    this._init_callback(event_name)

    const uuid = gen_uuid()

    this.outstanding_calls.set(uuid, callback)

    // const args: ToRequestEvents<EmitEvents>[EventName] = [uuid, ...call_args]
    // Disappointing, but this seems to be a limitation in the typescript type checker
    // (https://stackoverflow.com/questions/72704929/typescript-wrong-typechecking-when-remapping-keys-with-as-combined-with-generi)
    ;(
      this.socket.emit as unknown as (
        event_name: EventName,
        uuid: string,
        ...params: Parameters<EmitEvents[ToReqEventName<EventName>]>
      ) => void
    )(event_name, uuid, ...call_args)
  }
}
