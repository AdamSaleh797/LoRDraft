import { MakeErrStatus, OkStatus, Status, StatusCode } from 'lor_util'

type KeyT = string | number
type AnyFn = (...args: any) => void

export type StateMachineStateDef<State extends KeyT> = Partial<
  Record<State, AnyFn>
>

export type StateMachineDef<State extends KeyT> = {
  [StateInst in State]: StateMachineStateDef<State>
}

export class StateMachine<
  MachineDef extends StateMachineDef<State>,
  State extends KeyT
> {
  private state_machine_def_: MachineDef
  private state_: State
  private state_update_fn_?: (state: State) => void

  constructor(
    state_machine_def: MachineDef,
    initial_state: State,
    state_update_fn?: (state: State) => void
  ) {
    this.state_machine_def_ = state_machine_def
    this.state_ = initial_state
    this.state_update_fn_ = state_update_fn
  }

  state() {
    return this.state_
  }

  transition<
    FromT extends State,
    ToT extends MachineDef extends Record<FromT, infer U> ? keyof U : never,
    UpdateFnT extends MachineDef extends Record<FromT, infer U>
      ? U extends Record<ToT, infer V>
        ? V extends AnyFn
          ? V
          : never
        : never
      : never
  >(from: FromT, to: ToT, ...args: Parameters<UpdateFnT>): Status {
    if (this.state_ !== from) {
      return MakeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot transition from state ${from} to state ${to}, currently in state ${this.state_}`
      )
    }

    const state_def = this.state_machine_def_[from]
    const transition_fn = state_def[to] as UpdateFnT
    ;(transition_fn as AnyFn)(...args)

    if (this.state_update_fn_ !== undefined) {
      this.state_update_fn_(to)
    }
    this.state_ = to
    return OkStatus
  }

  transition_any(from: State, to: State, ...args: any): Status {
    if (this.state_machine_def_[from][to] === undefined) {
      return MakeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `transition from state ${from} to state ${to}, illegal transition`
      )
    }

    return this.transition(from, to as any, ...args)
  }

  undo_transition<
    FromT extends State,
    ToT extends MachineDef extends Record<FromT, infer U> ? keyof U : never
  >(current_state: ToT, prior_state: FromT): Status {
    if (this.state_ !== (current_state as unknown as State)) {
      return MakeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot undo transition from state ${current_state} back to state ${prior_state}, currently in state ${this.state_}`
      )
    }

    this.state_ = prior_state
    return OkStatus
  }

  undo_transition_any(current_state: State, prior_state: State): Status {
    if (this.state_ !== current_state) {
      return MakeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot undo transition from state ${current_state} back to state ${prior_state}, currently in state ${this.state_}`
      )
    }

    if (this.state_machine_def_[prior_state][current_state] === undefined) {
      return MakeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot undo transition from state ${current_state} back to state ${prior_state}, illegal transition`
      )
    }

    this.state_ = prior_state
    return OkStatus
  }
}
