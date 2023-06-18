import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { GameMetadata } from 'common/game/metadata'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'
import { Status, isOk } from 'common/util/status'

import { LoRDispatch, RootState } from 'client/store'
import { ThunkAPI, makeThunkPromise } from 'client/store/util'

const enum GameMetadataState {
  UNINITIALIZED = 'UNINITIALIZED',
  REQUEST_IN_FLIGHT = 'REQUEST_IN_FLIGHT',
  INITIALIZED = 'INITIALIZED',
}

export interface GlobalGameMetadata {
  state: GameMetadataState
  metadata: GameMetadata | null
}

export interface InitializedGlobalGameMetadata extends GlobalGameMetadata {
  state: GameMetadataState.INITIALIZED
  metadata: GameMetadata
}

/**
 * Returns true if the game metadata has been fetched. Will narrow the field
 * `metadata` to `GameMetadata` (removing the `| null`).
 */
export function hasGameMetadata(
  state: GlobalGameMetadata
): state is InitializedGlobalGameMetadata {
  return state.state === GameMetadataState.INITIALIZED
}

export interface FetchGameMetadataArgs {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
}

export async function fetchGameMetadataAsync(
  dispatch: LoRDispatch,
  args: FetchGameMetadataArgs
) {
  await new Promise((resolve) => {
    const callback = async () => {
      setTimeout(async () => {
        resolve(await dispatch(doFetchGameMetadataAsync(args)))
      }, 10)
    }
    callback()
  })
}

const doFetchGameMetadataAsync = createAsyncThunk<
  Status<GameMetadata>,
  FetchGameMetadataArgs,
  ThunkAPI
>(
  'gameMetadata/fetchGameMetadataAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('game_metadata', args.authInfo, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { gameMetadata } = getState()
      if (gameMetadata.state !== GameMetadataState.UNINITIALIZED) {
        return false
      }
    },
  }
)

const initialState: GlobalGameMetadata = {
  state: GameMetadataState.UNINITIALIZED,
  metadata: null,
}

const gameMetadataSlice = createSlice({
  name: 'gameMetadata',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(doFetchGameMetadataAsync.pending, (state) => {
        state.state = GameMetadataState.REQUEST_IN_FLIGHT
      })
      .addCase(doFetchGameMetadataAsync.fulfilled, (state, action) => {
        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = GameMetadataState.INITIALIZED
          state.metadata = action.payload.value
        } else {
          state.state = GameMetadataState.UNINITIALIZED
        }
      })
  },
})

export function selectGameMetadataState(state: RootState) {
  return state.gameMetadata
}

export default gameMetadataSlice.reducer
