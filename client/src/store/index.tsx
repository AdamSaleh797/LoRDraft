import { configureStore } from '@reduxjs/toolkit'

import draftStateReducer from 'client/store/draft'
import draftSketchReducer from 'client/store/draft_sketch'
import gameMetadataReducer from 'client/store/game_metadata'
import sessionStateReducer from 'client/store/session'

export const store = configureStore({
  reducer: {
    draft: draftStateReducer,
    gameMetadata: gameMetadataReducer,
    session: sessionStateReducer,
    draftSketches: draftSketchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type LoRDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
