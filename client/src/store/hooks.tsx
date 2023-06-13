import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import type { AppDispatch, RootState } from 'client/store'

export const useLoRDispatch: () => AppDispatch = useDispatch
export const useLoRSelector: TypedUseSelectorHook<RootState> = useSelector
