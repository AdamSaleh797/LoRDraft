import {
  makeErrStatus,
  makeOkStatus,
  OkStatus,
  Status,
  StatusCode,
} from 'util/status'
import { ReturnTypeOrNever } from './lor_util'

type KeyT = string | number
type AnyFn<ArgT, ReturnT, ArgsT extends unknown[]> = (
  state_prop: ArgT,
  ...args: ArgsT
) => ReturnT

export type StateMachineStateDef<State extends KeyT, StateProp> = Partial<
  Record<State, AnyFn<StateProp, any, any[]>>
>

export type StateMachineDef<State extends KeyT> = {
  [StateInst in State]: StateMachineStateDef<State, any>
}

/**
 * Given the machine type and a state `FromT`, gives the type of all
 * transitions that can be made from this state.
 */
type AllTransitions<
  StatesT extends KeyT,
  MachineDef extends StateMachineDef<StatesT>,
  FromT extends StatesT
> = MachineDef extends Record<FromT, infer U> ? keyof U : never

type StatePropFromTransitions<
  StatesT extends KeyT,
  MachineDef extends StateMachineDef<StatesT>,
  StateT extends StatesT
> = MachineDef extends Record<StateT, infer U>
  ? U extends StateMachineStateDef<StatesT, infer StatePropT>
    ? StatePropT
    : never
  : never

/**
 * Given the machine def and a transition state, returns the type of all states
 * which have transitions to the transition state.
 */
type StatesContainingTransition<
  StatesT extends KeyT,
  MachineDef extends StateMachineDef<StatesT>,
  TransitionT extends StatesT
> = {
  [Key in StatesT]: MachineDef[Key] extends Record<TransitionT, any>
    ? Key
    : never
}[StatesT]

type StatePropFromCallers<
  StatesT extends KeyT,
  MachineDef extends StateMachineDef<StatesT>,
  StateT extends StatesT
> = ReturnTypeOrNever<
  MachineDef[StatesContainingTransition<StatesT, MachineDef, StateT>][StateT]
>

/**
 * Given the machine def and a particular state, gives the type of the property
 * of that state.
 */
type StateProp<
  StatesT extends KeyT,
  MachineDef extends StateMachineDef<StatesT>,
  StateT extends StatesT
> = unknown extends StatePropFromTransitions<StatesT, MachineDef, StateT>
  ? StatePropFromCallers<StatesT, MachineDef, StateT>
  : StatePropFromTransitions<StatesT, MachineDef, StateT>

/**
 * Given the machine type and a transition from state FromT to state ToT, gives
 * the types of the arguments that need to be passed to the transition function.
 */
type TransitionFnArgsT<
  StatesT extends KeyT,
  MachineDef extends StateMachineDef<StatesT>,
  FromT extends StatesT,
  ToT extends StatesT
> = MachineDef extends Record<FromT, infer U>
  ? U extends Record<ToT, infer V>
    ? V extends AnyFn<
        StateProp<StatesT, MachineDef, FromT>,
        StateProp<StatesT, MachineDef, ToT>,
        infer FnArgs
      >
      ? FnArgs
      : never
    : never
  : never

export class StateMachine<
  MachineDef extends StateMachineDef<State>,
  State extends KeyT
> {
  private state_machine_def_: MachineDef
  private state_: State
  private state_prop_: any
  private state_update_fn_?: (state: State) => void

  private constructor(
    state_machine_def: MachineDef,
    initial_state: State,
    state_prop: any,
    state_update_fn?: (state: State) => void
  ) {
    this.state_machine_def_ = state_machine_def
    this.state_ = initial_state
    this.state_prop_ = state_prop
    this.state_update_fn_ = state_update_fn
  }

  static makeStateMachine<
    State extends KeyT,
    MachineDef extends StateMachineDef<State>,
    InitialState extends State
  >(
    state_machine_def: MachineDef,
    initial_state: InitialState,
    state_prop: StateProp<State, MachineDef, InitialState>,
    state_update_fn?: (state: State) => void
  ): StateMachine<MachineDef, State> {
    return new StateMachine<MachineDef, State>(
      state_machine_def,
      initial_state,
      state_prop,
      state_update_fn
    )
  }

  state() {
    return this.state_
  }

  state_prop<StateT extends State>(): StateProp<State, MachineDef, StateT> {
    return this.state_prop_
  }

  state_prop_exact<StateT extends State>(
    state: StateT
  ): Status<StateProp<State, MachineDef, StateT>> {
    if (this.state_ !== state) {
      return makeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `State machine not in expected state ${state} when trying to retrieve property, in state ${this.state_}`
      )
    }

    return makeOkStatus(this.state_prop_)
  }

  transition<
    FromT extends State,
    ToT extends AllTransitions<State, MachineDef, FromT>,
    UpdateFnArgsT extends TransitionFnArgsT<State, MachineDef, FromT, ToT>
  >(from: FromT, to: ToT, ...args: UpdateFnArgsT): Status {
    if (this.state_ !== from) {
      return makeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot transition from state ${from} to state ${to}, currently in state ${this.state_}`
      )
    }

    this.state_ = to
    if (this.state_update_fn_ !== undefined) {
      this.state_update_fn_(to)
    }

    const state_def = this.state_machine_def_[from]
    const transition_fn = state_def[to]
    this.state_prop_ = (
      transition_fn as AnyFn<
        StateProp<State, MachineDef, FromT>,
        StateProp<State, MachineDef, ToT>,
        UpdateFnArgsT
      >
    )(this.state_prop_ as any, ...args)

    return OkStatus
  }

  transition_any(from: State, to: State, ...args: any): Status {
    if (this.state_machine_def_[from][to] === undefined) {
      return makeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `transition from state ${from} to state ${to}, illegal transition`
      )
    }

    return this.transition(from, to as any, ...args)
  }

  undo_transition<
    FromT extends State,
    ToT extends AllTransitions<State, MachineDef, FromT>,
    StatePropT extends StateProp<State, MachineDef, FromT>
  >(current_state: ToT, prior_state: FromT, prior_prop: StatePropT): Status {
    if (this.state_ !== (current_state as unknown as State)) {
      return makeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot undo transition from state ${current_state} back to state ${prior_state}, currently in state ${this.state_}`
      )
    }

    this.state_ = prior_state
    this.state_prop_ = prior_prop
    return OkStatus
  }

  undo_transition_any(
    current_state: State,
    prior_state: State,
    prior_prop: any
  ): Status {
    if (this.state_ !== current_state) {
      return makeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot undo transition from state ${current_state} back to state ${prior_state}, currently in state ${this.state_}`
      )
    }

    if (this.state_machine_def_[prior_state][current_state] === undefined) {
      return makeErrStatus(
        StatusCode.INVALID_STATE_TRANSITION,
        `Cannot undo transition from state ${current_state} back to state ${prior_state}, illegal transition`
      )
    }

    this.state_ = prior_state
    this.state_prop_ = prior_prop
    return OkStatus
  }
}
