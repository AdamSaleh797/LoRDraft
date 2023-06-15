import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { Card } from 'common/game/card'
import { DraftStateInfo } from 'common/game/draft'
import { DraftOptions } from 'common/game/draft_options'
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs'
import { Status, isOk } from 'common/util/status'

import { RootState } from 'client/store'
import { ThunkAPI, makeThunkPromise } from 'client/store/util'

const enum DraftStateMessage {
  JOIN_DRAFT = 'JOIN_DRAFT',
  UPDATE_DRAFT = 'UPDATE_DRAFT',
  EXIT_DRAFT = 'EXIT_DRAFT',
  CHOOSE_CARDS = 'CHOOSE_CARDS',
}

export interface GlobalDraftState {
  state: DraftStateInfo | null
  messageInFlight: DraftStateMessage | null
}

interface RunningDraftState extends GlobalDraftState {
  state: DraftStateInfo
}

export function inDraft(state: GlobalDraftState): state is RunningDraftState {
  return state.state !== null
}

export interface JoinDraftArgs {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
  draftOptions: DraftOptions
}

export const doJoinDraftAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  JoinDraftArgs,
  ThunkAPI
>(
  'draft/joinDraftAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('join_draft', args.authInfo, args.draftOptions, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState()
      if (draft.state !== null || draft.messageInFlight !== null) {
        // If there is already a draft state, some other message is in flight,
        // don't try to join a new draft.
        return false
      }
    },
  }
)

export interface UpdateDraftArgs {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
}

export const doUpdateDraftAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  UpdateDraftArgs,
  ThunkAPI
>(
  'draft/updateDraftAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('current_draft', args.authInfo, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState()
      if (draft.state !== null || draft.messageInFlight !== null) {
        // If there is already a draft state, some other message is in flight,
        // don't try to update it.
        return false
      }
    },
  }
)

export interface ExitDraftArgs {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
}

export const doExitDraftAsync = createAsyncThunk<
  Status,
  ExitDraftArgs,
  ThunkAPI
>(
  'draft/exitDraftAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('close_draft', args.authInfo, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState()
      if (draft.state === null || draft.messageInFlight !== null) {
        // If there is no draft state, or some other message is in flight,
        // don't follow through with this action.
        return false
      }
    },
  }
)

export interface ChooseDraftCardsArgs {
  socket: LoRDraftClientSocket
  authInfo: AuthInfo
  cards: Card[]
}

export const doChooseDraftCardsAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  ChooseDraftCardsArgs,
  ThunkAPI
>(
  'draft/chooseDraftCardsAsync',
  async (args) => {
    return await makeThunkPromise((resolve) => {
      args.socket.call('choose_cards', args.authInfo, args.cards, resolve)
    })
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState()
      if (draft.state === null || draft.messageInFlight !== null) {
        // If there is no draft state, or some other message is in flight,
        // don't follow through with this action.
        return false
      }
    },
  }
)

const initialState: GlobalDraftState = {
  state: null,
  messageInFlight: null,
}

const draftStateSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    // setState: (state, action: PayloadAction<DraftStateInfo>) => {
    //   state.state = action.payload
    // },
    clearDraftState: (state) => {
      if (state.messageInFlight === null) {
        state.state = null
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(doJoinDraftAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.JOIN_DRAFT
      })
      .addCase(doJoinDraftAsync.fulfilled, (state, action) => {
        state.messageInFlight = null

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = action.payload.value
        }
      })
      .addCase(doUpdateDraftAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.UPDATE_DRAFT
      })
      .addCase(doUpdateDraftAsync.fulfilled, (state, action) => {
        state.messageInFlight = null

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = action.payload.value
        }
      })
      .addCase(doExitDraftAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.EXIT_DRAFT
      })
      .addCase(doExitDraftAsync.fulfilled, (state, action) => {
        state.messageInFlight = null

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = null
        }
      })
      .addCase(doChooseDraftCardsAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.CHOOSE_CARDS
      })
      .addCase(doChooseDraftCardsAsync.fulfilled, (state, action) => {
        state.messageInFlight = null

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

export const { clearDraftState } = draftStateSlice.actions

export default draftStateSlice.reducer
