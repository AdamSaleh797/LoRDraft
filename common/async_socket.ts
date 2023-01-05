import { Socket as ClientSocket } from 'socket.io-client'
import { Socket as ServerSocket } from 'socket.io'
import { Empty, gen_uuid, MakeErrStatus, Status, StatusCode } from 'lor_util'

interface EventsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MakeOptional<T extends any[]> = {
  [I in keyof T]: T[I] | null
}

type EventNames<Map extends EventsMap> = keyof Map & string

type ToReqEventName<EmitEventName extends string> = `${EmitEventName}_req`
type ToResEventName<EmitEventName extends string> = `${EmitEventName}_res`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InternalCallbackT<Params extends Parameters<any>> = (
  uuid: string,
  ...args: Params
) => void

type ToRequestEvents<Events extends EventsMap> = {
  [Ev in keyof Events as Ev extends `${infer T}_req`
    ? T & string
    : never]: InternalCallbackT<Parameters<Events[Ev]>>
}

type ToResponseEvents<Events extends EventsMap> = {
  [Ev in keyof Events as Ev extends `${infer T}_res`
    ? T & string
    : never]: InternalCallbackT<Parameters<Events[Ev]>>
}

type ReqParams<
  EventName extends keyof Events & string,
  Events extends EventsMap
> = Parameters<Events[ToReqEventName<EventName>]>

type ResParams<
  EventName extends keyof Events & string,
  Events extends EventsMap
> = Parameters<Events[ToResEventName<EventName>]>

// Async compatible events are events that have a *_req form in ReqEvents and a
// *_res form in ResEvents.
type AsyncCompatibleEvents<
  ResEvents extends EventsMap,
  ReqEvents extends EventsMap
> = EventNames<ToRequestEvents<ReqEvents>> &
  EventNames<ToResponseEvents<ResEvents>>

interface AsyncMessage<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap,
  EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>,
  Args extends ResParams<EventName, ListenEvents>
> {
  timeout_id: NodeJS.Timeout
  callback: (...args: Args) => void
}

type ResponseCallbackArgsT<
  Params extends Parameters<(...args: unknown[]) => void>
> = Params extends Parameters<(status: Status, ...args: infer U) => void>
  ? Parameters<(status: Status, ...args: MakeOptional<U>) => void>
  : never

export type ResponseCallbackT<
  EventName extends keyof ToResponseEvents<ListenEvents> & string,
  ListenEvents extends EventsMap
> = (...args: ResponseCallbackArgsT<ResParams<EventName, ListenEvents>>) => void

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
  private readonly listeners: Map<string, InternalCallbackT<never>>
  private readonly outstanding_calls: Map<
    string,
    AsyncMessage<ListenEvents, EmitEvents, never, never>
  >
  private timeout: number

  constructor(
    socket: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
      | ClientSocket<ListenEvents, EmitEvents>
  ) {
    this.socket = socket
    this.listeners = new Map()
    this.outstanding_calls = new Map()
    this.timeout = 1000
  }

  private _raw_socket():
    | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
    | ClientSocket<ListenEvents, EmitEvents> {
    return this.socket as unknown as
      | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
      | ClientSocket<ListenEvents, EmitEvents>
  }

  private _init_callback<
    EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>
  >(event: EventName): void {
    type CallbackT = InternalCallbackT<ResParams<EventName, ListenEvents>>

    if (!this.listeners.has(event)) {
      const cb: CallbackT = (uuid, ...call_args) => {
        console.log(uuid, call_args)
        if (!this.outstanding_calls.has(uuid)) {
          console.log(`Error: received event with unknown uuid: ${uuid}`)
          return
        }

        const message_info = this.outstanding_calls.get(uuid) as AsyncMessage<
          ListenEvents,
          EmitEvents,
          EventName,
          ResParams<EventName, ListenEvents>
        >
        clearTimeout(message_info.timeout_id)
        message_info.callback(...call_args)
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

  private _add_timeout<
    EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>
  >(
    event_name: string,
    uuid: string,
    timeout_ms: number,
    callback: ResponseCallbackT<EventName, ListenEvents>
  ): NodeJS.Timeout {
    return setTimeout(() => {
      this.outstanding_calls.delete(uuid)

      const cb = callback as (status: Status, ...args: null[]) => void
      cb(
        MakeErrStatus(
          StatusCode.MESSAGE_TIMEOUT,
          `Async socket call ${event_name} timed out after ${
            timeout_ms / 1000
          } second${timeout_ms === 1000 ? '' : 's'}`
        ),
        ...new Array(callback.length - 1).fill(null)
      )
    }, timeout_ms)
  }

  emit<EventName extends EventNames<EmitEvents>>(
    event_name: EventName,
    ...args: Parameters<EmitEvents[EventName]>
  ) {
    this._raw_socket().emit(event_name, ...args)
  }

  on<EventName extends EventNames<ListenEvents>>(
    event_name: EventName,
    callback: ListenEvents[EventName]
  ) {
    const on_call: (ev: EventName, cb: ListenEvents[EventName]) => void =
      this._raw_socket().on
    on_call(event_name, callback)
  }

  call<EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>>(
    event_name: EventName,
    ...args: [
      ...ReqParams<EventName, EmitEvents>,
      ResponseCallbackT<EventName, ListenEvents>
    ]
  ): void {
    const callback = args.at(-1) as ResponseCallbackT<EventName, ListenEvents>
    const call_args = args.slice(0, -1) as ReqParams<EventName, EmitEvents>

    this._init_callback(event_name)

    const uuid = gen_uuid()

    const timeout_id = this._add_timeout(
      event_name,
      uuid,
      this.timeout,
      callback
    )

    this.outstanding_calls.set(uuid, {
      timeout_id: timeout_id,
      callback: callback,
    })

    // const args: ToRequestEvents<EmitEvents>[EventName] = [uuid, ...call_args]
    // Disappointing, but this seems to be a limitation in the typescript type checker
    // (https://stackoverflow.com/questions/72704929/typescript-wrong-typechecking-when-remapping-keys-with-as-combined-with-generi)
    ;(
      this.socket.emit as unknown as (
        event_name: EventName,
        uuid: string,
        ...params: ReqParams<EventName, EmitEvents>
      ) => void
    )(event_name, uuid, ...call_args)
  }

  respond<EventName extends AsyncCompatibleEvents<EmitEvents, ListenEvents>>(
    event_name: EventName,
    callback: (
      resolve: (...args: ResParams<EventName, EmitEvents>) => void,
      ...args: ReqParams<EventName, ListenEvents>
    ) => void
  ): void {
    type UserCallbackT = InternalCallbackT<ReqParams<EventName, ListenEvents>>
    ;(
      this.socket.on as unknown as (
        event_name: EventName,
        callback: UserCallbackT
      ) => void
    )(
      event_name,
      (uuid: string, ...params: ReqParams<EventName, ListenEvents>): void => {
        callback((...result) => {
          // prettier-ignore
          (
            this.socket.emit as unknown as (
              event_name: EventName,
              uuid: string,
              ...params: ResParams<EventName, EmitEvents>
            ) => void
          )(event_name, uuid, ...result)
        }, ...params)
      }
    )
  }
}
