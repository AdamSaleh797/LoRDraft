import { configureStore } from '@reduxjs/toolkit'

import draftStateReducer from 'client/store/draft'
import sessionStateReducer from 'client/store/session'

export const store = configureStore({
  reducer: {
    session: sessionStateReducer,
    draft: draftStateReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type LoRDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>