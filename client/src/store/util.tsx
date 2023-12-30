import { ErrStatusT } from 'common/util/status';

import { RootState } from 'client/store';

export interface ThunkAPI {
  state: RootState;
  rejectValue: ErrStatusT;
}

/**
 * Don't allow rejecting promises, all promises should be resolved with a
 * `Status`.
 */
export function makeThunkPromise<T>(
  callback: (resolve: (value: T) => void) => void
) {
  return new Promise<T>(callback);
}
