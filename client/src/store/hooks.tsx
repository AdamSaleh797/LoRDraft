import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { LoRDispatch, RootState } from 'client/store';

export const useLoRDispatch: () => LoRDispatch = useDispatch;
export const useLoRSelector: TypedUseSelectorHook<RootState> = useSelector;
