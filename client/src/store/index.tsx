import { configureStore } from '@reduxjs/toolkit'

import sessionStateReducer from 'client/store/session'

export const store = configureStore({
  reducer: {
    session: sessionStateReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
