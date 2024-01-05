/* eslint-disable @typescript-eslint/no-explicit-any */
import { Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { DeepReadonly } from 'ts-essentials';

import {
  DeepReadonlyTuple,
  Empty,
  filterPII,
  genUUID,
} from 'common/util/lor_util';
import { Status, StatusCode, makeErrStatus } from 'common/util/status';

interface EventsMap {
  [event: string]: any;
}

type EventNames<Map extends EventsMap> = keyof Map & string;

type ToReqEventName<EmitEventName extends string> = `${EmitEventName}_req`;
type ToResEventName<EmitEventName extends string> = `${EmitEventName}_res`;

export type InternalCallbackT<Params extends Parameters<any>> = (
  uuid: string,
  ...args: Params
) => void;

type ToRequestEvents<Events extends EventsMap> = {
  [Ev in keyof Events as Ev extends `${infer T}_req`
    ? T & string
    : never]: InternalCallbackT<Parameters<Events[Ev]>>;
};

type ToResponseEvents<Events extends EventsMap> = {
  [Ev in keyof Events as Ev extends `${infer T}_res`
    ? T & string
    : never]: InternalCallbackT<Parameters<Events[Ev]>>;
};

type ReqParams<
  EventName extends keyof Events & string,
  Events extends EventsMap
> = Parameters<Events[ToReqEventName<EventName>]>;

type ResParams<
  EventName extends keyof Events & string,
  Events extends EventsMap
> = Parameters<Events[ToResEventName<EventName>]>;

// Async compatible events are events that have a *_req form in ReqEvents and a
// *_res form in ResEvents.
type AsyncCompatibleEvents<
  ResEvents extends EventsMap,
  ReqEvents extends EventsMap
> = EventNames<ToRequestEvents<ReqEvents>> &
  EventNames<ToResponseEvents<ResEvents>>;

type ResponseT<
  EventName extends keyof ToResponseEvents<Events> & string,
  Events extends EventsMap
> = ResParams<EventName, Events> extends Parameters<
  (status: Status<infer T>) => void
>
  ? Status<T>
  : never;

interface AsyncMessage<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap,
  EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>
> {
  timeoutId: NodeJS.Timeout;
  resolve: (response: ResponseT<EventName, ListenEvents>) => void;
}

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
    | ClientSocket<ToResponseEvents<ListenEvents>, ToRequestEvents<EmitEvents>>;
  // A map from message names to the listeners bound to those messages.
  private readonly listeners: Map<string, InternalCallbackT<never>>;
  private readonly outstanding_calls: Map<
    string,
    AsyncMessage<ListenEvents, EmitEvents, never>
  >;
  private timeout: number;
  private verbose: boolean;

  constructor(
    socket:
      | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
      | ClientSocket<ListenEvents, EmitEvents>,
    verbose?: boolean
  ) {
    this.socket = socket;
    this.listeners = new Map();
    this.outstanding_calls = new Map();
    this.timeout = 1000;
    this.verbose = verbose ?? false;
  }

  private rawSocket():
    | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
    | ClientSocket<ListenEvents, EmitEvents> {
    return this.socket as unknown as
      | ServerSocket<ListenEvents, EmitEvents, Empty, Empty>
      | ClientSocket<ListenEvents, EmitEvents>;
  }

  private initCallback<
    EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>
  >(event: EventName): void {
    type CallbackT = InternalCallbackT<[ResponseT<EventName, ListenEvents>]>;

    if (!this.listeners.has(event)) {
      const cb: CallbackT = (uuid, response) => {
        if (this.verbose) {
          console.log(`Receiving ${uuid} with`, filterPII(response));
        }
        if (!this.outstanding_calls.has(uuid)) {
          console.error(`Error: received event with unknown uuid: ${uuid}`);
          return;
        }

        const message_info = this.outstanding_calls.get(uuid) as AsyncMessage<
          ListenEvents,
          EmitEvents,
          EventName
        >;
        clearTimeout(message_info.timeoutId);
        message_info.resolve(response);
      };

      this.listeners.set(event, cb);
      (
        this.socket.on as unknown as (
          event_name: EventName,
          callback: CallbackT
        ) => void
      )(event, cb);
    }
  }

  private addTimeout<
    EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>
  >(
    event_name: string,
    uuid: string,
    timeout_ms: number,
    resolve: (response: ResponseT<EventName, ListenEvents>) => void
  ): NodeJS.Timeout {
    return setTimeout(() => {
      this.outstanding_calls.delete(uuid);

      (resolve as (response: Status<unknown>) => void)(
        makeErrStatus(
          StatusCode.MESSAGE_TIMEOUT,
          `Async socket call ${event_name} timed out after ${
            timeout_ms / 1000
          } second${timeout_ms === 1000 ? '' : 's'}`
        )
      );
    }, timeout_ms);
  }

  emit<EventName extends EventNames<EmitEvents>>(
    event_name: EventName,
    ...args: DeepReadonlyTuple<Parameters<EmitEvents[EventName]>>
  ) {
    if (this.verbose) {
      console.log(`emitting ${event_name} with`, filterPII(args));
    }
    this.rawSocket().emit(event_name, ...args);
  }

  on<EventName extends EventNames<ListenEvents>>(
    event_name: EventName,
    callback: ListenEvents[EventName]
  ) {
    const onCall: (ev: EventName, cb: ListenEvents[EventName]) => void =
      this.rawSocket().on;
    let cb: ListenEvents[EventName];
    if (this.verbose) {
      cb = ((...args: unknown[]) => {
        console.log(`responding (on) ${event_name} with`, filterPII(args));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        callback(...args);
      }) as ListenEvents[EventName];
    } else {
      cb = callback;
    }
    onCall(event_name, cb);
  }

  async call<EventName extends AsyncCompatibleEvents<ListenEvents, EmitEvents>>(
    event_name: EventName,
    ...args: ReqParams<EventName, EmitEvents>
  ): Promise<ResponseT<EventName, ListenEvents>> {
    if (this.verbose) {
      console.log(`calling ${event_name} with`, filterPII(args));
    }

    this.initCallback(event_name);

    const uuid = genUUID();

    return new Promise((resolve) => {
      const timeout_id = this.addTimeout(
        event_name,
        uuid,
        this.timeout,
        resolve
      );

      this.outstanding_calls.set(uuid, {
        timeoutId: timeout_id,
        resolve,
      });

      // const args: ToRequestEvents<EmitEvents>[EventName] = [uuid, ...call_args]
      // Disappointing, but this seems to be a limitation in the typescript type checker
      // (https://stackoverflow.com/questions/72704929/typescript-wrong-typechecking-when-remapping-keys-with-as-combined-with-generi)
      (
        this.socket.emit as unknown as (
          event_name: EventName,
          uuid: string,
          ...params: ReqParams<EventName, EmitEvents>
        ) => void
      )(event_name, uuid, ...args);
    });
  }

  respond<EventName extends AsyncCompatibleEvents<EmitEvents, ListenEvents>>(
    event_name: EventName,
    callback: (
      ...args: ReqParams<EventName, ListenEvents>
    ) => Promise<DeepReadonly<ResponseT<EventName, EmitEvents>>>
  ): void {
    type UserCallbackT = InternalCallbackT<ReqParams<EventName, ListenEvents>>;
    (
      this.socket.on as unknown as (
        event_name: EventName,
        callback: UserCallbackT
      ) => void
    )(
      event_name,
      async (uuid: string, ...params: ReqParams<EventName, ListenEvents>) => {
        if (this.verbose) {
          console.log(
            `received ${event_name} (${uuid}) with`,
            filterPII(params)
          );
        }
        const result = await callback(...params);
        if (this.verbose) {
          console.log(
            `responding ${event_name} (${uuid}) with`,
            filterPII(result)
          );
        }
        (
          this.socket.emit as unknown as (
            event_name: EventName,
            uuid: string,
            result: DeepReadonly<ResponseT<EventName, EmitEvents>>
          ) => void
        )(event_name, uuid, result);
      }
    );
  }
}
