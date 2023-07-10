import { combineReducers, configureStore } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist'
import { AsyncNodeStorage } from 'redux-persist-node-storage'

import setPacksReducer from 'server/store/set_packs'

const reducer = combineReducers({
  setPacks: setPacksReducer,
})

const persistConfig = {
  key: 'root',
  version: 1,
  storage: new AsyncNodeStorage('../dist/store'),
}

const persistedReducer = persistReducer(persistConfig, reducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)
export const dispatch: LoRServerDispatch = store.dispatch

export type LoRServerDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
