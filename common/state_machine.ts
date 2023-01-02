type KeyT = string | number | symbol
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  state_machine_def: MachineDef
  state: State
  state_update_fn?: (state: State) => void

  constructor(
    state_machine_def: MachineDef,
    initial_state: State,
    state_update_fn?: (state: State) => void
  ) {
    this.state_machine_def = state_machine_def
    this.state = initial_state
    this.state_update_fn = state_update_fn
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition<
    FromT extends State,
    ToT extends State extends Exclude<State, FromT>
      ? MachineDef extends Record<FromT, infer U>
        ? keyof U
        : never
      : never,
    UpdateFnT extends MachineDef extends Record<FromT, infer U>
      ? U extends Record<ToT, infer V>
        ? V extends AnyFn
          ? V
          : never
        : never
      : never
  >(from: FromT, to: ToT, ...args: Parameters<UpdateFnT>): boolean {
    if (this.state !== from) {
      return false
    }

    const state_def = this.state_machine_def[from]
    const transition_fn = state_def[to] as UpdateFnT
    ;(transition_fn as AnyFn)(...args)

    if (this.state_update_fn !== undefined) {
      this.state_update_fn(to)
    }
    this.state = to
    return true
  }
}
