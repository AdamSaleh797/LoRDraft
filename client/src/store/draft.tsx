import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { DraftStateInfo } from 'common/game/draft'
import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'
import { Status, isOk } from 'common/util/status'

import { RootState } from 'client/store'
import { ThunkAPI, makeThunkPromise } from 'client/store/util'

const enum DraftStateMessage {
  UPDATE_DRAFT = 'UPDATE_DRAFT',
}

export interface GlobalDraftState {
  state: DraftStateInfo | null
  message_in_flight: DraftStateMessage | null
}

export interface UpdateDraftArgs {
  socket: LoRDraftClientSocket
  auth_info: SessionCred
}

export const doUpdateDraftAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  UpdateDraftArgs,
  ThunkAPI
>(
  'draft/updateDraftAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('current_draft', args.auth_info, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState()
      if (draft.state !== null || draft.message_in_flight !== null) {
        // If there is already a draft state, or we're already fetching the
        // current draft state, don't try to update it.
        return false
      }
    },
  }
)

const initialState: GlobalDraftState = {
  state: null,
  message_in_flight: null,
}

const draftStateSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    setState: (state, action: PayloadAction<DraftStateInfo>) => {
      state.state = action.payload
    },
    clearState: (state) => {
      state.state = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(doUpdateDraftAsync.pending, (state) => {
        state.message_in_flight = DraftStateMessage.UPDATE_DRAFT
      })
      .addCase(doUpdateDraftAsync.fulfilled, (state, action) => {
        state.message_in_flight = null

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = action.payload.value
        }
      })
  },
})

export function selectDraftState(state: RootState) {
  return state.draft
}

export default draftStateSlice.reducer
