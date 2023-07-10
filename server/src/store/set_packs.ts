import { PayloadAction, createSlice } from '@reduxjs/toolkit'

import { LoRServerDispatch, RootState } from 'server/store'

export interface SetPackState {
  lastModified: string | null
}

export interface SetPacksState {
  setPacks: Partial<Record<string, SetPackState>>
}

const initialState: SetPacksState = {
  setPacks: {},
}

export function stateContainsSetPack(
  setPacks: Partial<Record<string, SetPackState>>,
  setPack: string
): setPacks is Record<typeof setPack, SetPackState> {
  return setPack in setPacks
}

const setPacksSlice = createSlice({
  name: 'setPacks',
  initialState,
  reducers: {
    updateSetPack: (
      state,
      action: PayloadAction<{ setPack: string; lastModified: string | null }>
    ) => {
      const name = action.payload.setPack
      if (stateContainsSetPack(state.setPacks, name)) {
        state.setPacks[name].lastModified = action.payload.lastModified
      } else {
        state.setPacks[action.payload.setPack] = {
          lastModified: action.payload.lastModified,
        }
      }
    },
  },
})

export function selectSetPacksState(state: RootState) {
  return state.setPacks
}

export function updateSetPack(
  dispatch: LoRServerDispatch,
  args: { setPack: string; lastModified: string | null }
) {
  dispatch(setPacksSlice.actions.updateSetPack(args))
}

export default setPacksSlice.reducer
