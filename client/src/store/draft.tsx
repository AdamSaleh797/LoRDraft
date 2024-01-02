import { Draft, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { Card } from 'common/game/card';
import { DraftStateInfo } from 'common/game/draft';
import { DraftOptions } from 'common/game/draft_options';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';
import { Status, isOk } from 'common/util/status';

import { RootState } from 'client/store';
import { ThunkAPI } from 'client/store/util';

const enum DraftStateMessage {
  JOIN_DRAFT = 'JOIN_DRAFT',
  UPDATE_DRAFT = 'UPDATE_DRAFT',
  EXIT_DRAFT = 'EXIT_DRAFT',
  CHOOSE_CARDS = 'CHOOSE_CARDS',
}

export interface GlobalDraftState {
  state: DraftStateInfo | null;
  messageInFlight: DraftStateMessage | null;
}

interface RunningDraftState extends GlobalDraftState {
  state: DraftStateInfo;
}

/**
 * Returns true if the draft state is in a draft currently. If true, this makes
 * the field `state` available for the draft state.
 */
export function inDraft(state: GlobalDraftState): state is RunningDraftState {
  return state.state !== null;
}

export interface JoinDraftArgs {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
  draftOptions: DraftOptions;
}

/**
 * Makes a `'join_draft'` request to start a new draft session. If the request
 * succeeds, the draft state is added to the global state, and `inDraft` will
 * return true.
 */
export const doJoinDraftAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  JoinDraftArgs,
  ThunkAPI
>(
  'draft/joinDraftAsync',
  async (args) => {
    return await args.socket.call(
      'join_draft',
      args.authInfo,
      args.draftOptions
    );
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState();
      if (draft.state !== null || draft.messageInFlight !== null) {
        // If there is already a draft state, some other message is in flight,
        // don't try to join a new draft.
        return false;
      }
    },
  }
);

export interface UpdateDraftArgs {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
}

/**
 * Queries the server for the current draft state of this user. If the user is
 * in a draft state, the global state is updated and `inDraft` will return true.
 */
export const doUpdateDraftAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  UpdateDraftArgs,
  ThunkAPI
>(
  'draft/updateDraftAsync',
  async (args) => {
    return await args.socket.call('current_draft', args.authInfo);
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState();
      if (draft.state !== null || draft.messageInFlight !== null) {
        // If there is already a draft state, some other message is in flight,
        // don't try to update it.
        return false;
      }
    },
  }
);

export interface ExitDraftArgs {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
}

/**
 * Exits the draft that this user is currently in. If the request succeeds, the
 * global draft state is mutated and `inDraft` will return false.
 */
export const doExitDraftAsync = createAsyncThunk<
  Status,
  ExitDraftArgs,
  ThunkAPI
>(
  'draft/exitDraftAsync',
  async (args) => {
    return await args.socket.call('close_draft', args.authInfo);
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState();
      if (draft.state === null || draft.messageInFlight !== null) {
        // If there is no draft state, or some other message is in flight,
        // don't follow through with this action.
        return false;
      }
    },
  }
);

export interface ChooseDraftCardsArgs {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
  cards: Card[];
}

/**
 * Chooses cards from the current set of pending cards. If the request succeeds,
 * the global state mutates, the chosen card(s) are added to the list of cards,
 * and new pending cards are made available.
 */
export const doChooseDraftCardsAsync = createAsyncThunk<
  Status<DraftStateInfo>,
  ChooseDraftCardsArgs,
  ThunkAPI
>(
  'draft/chooseDraftCardsAsync',
  async (args) => {
    return await args.socket.call('choose_cards', args.authInfo, args.cards);
  },
  {
    condition: (_, { getState }) => {
      const { draft } = getState();
      if (draft.state === null || draft.messageInFlight !== null) {
        // If there is no draft state, or some other message is in flight,
        // don't follow through with this action.
        return false;
      }
    },
  }
);

const initialState: GlobalDraftState = {
  state: null,
  messageInFlight: null,
};

/**
 * Global manager for the current draft state of the logged in user. All
 * requests to retrieve the current draft, modify the draft in any way, join a
 * new draft, or leave the current draft should be done through this interface.
 */
const draftStateSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    clearDraftState: (state) => {
      if (state.messageInFlight === null) {
        state.state = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(doJoinDraftAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.JOIN_DRAFT;
      })
      .addCase(doJoinDraftAsync.fulfilled, (state, action) => {
        state.messageInFlight = null;

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = action.payload.value as Draft<DraftStateInfo>;
        }
      })
      .addCase(doUpdateDraftAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.UPDATE_DRAFT;
      })
      .addCase(doUpdateDraftAsync.fulfilled, (state, action) => {
        state.messageInFlight = null;

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = action.payload.value as Draft<DraftStateInfo>;
        }
      })
      .addCase(doExitDraftAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.EXIT_DRAFT;
      })
      .addCase(doExitDraftAsync.fulfilled, (state, action) => {
        state.messageInFlight = null;

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = null;
        }
      })
      .addCase(doChooseDraftCardsAsync.pending, (state) => {
        state.messageInFlight = DraftStateMessage.CHOOSE_CARDS;
      })
      .addCase(doChooseDraftCardsAsync.fulfilled, (state, action) => {
        state.messageInFlight = null;

        // Update the state only if this operation succeeded.
        if (isOk(action.payload)) {
          state.state = action.payload.value as Draft<DraftStateInfo>;
        }
      });
  },
});

export function selectDraftState(state: RootState) {
  return state.draft;
}

export function selectDraftStateDeck(state: RootState) {
  return state.draft.state?.deck;
}

export const { clearDraftState } = draftStateSlice.actions;

export default draftStateSlice.reducer;
