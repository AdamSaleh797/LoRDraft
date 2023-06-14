import { configureStore } from '@reduxjs/toolkit'

import { ErrStatusT } from 'common/util/status'

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

export interface ThunkAPI {
  state: RootState
  rejectValue: ErrStatusT
}

/**
 * Don't allow rejecting promises, all promises should be resolved with a
 * `Status`.
 */
export function makeThunkPromise<T>(
  callback: (resolve: (value: T) => void) => void
) {
  return new Promise<T>(callback)
}
