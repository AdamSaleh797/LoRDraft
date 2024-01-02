import { ErrStatusT } from 'common/util/status';

import { RootState } from 'client/store';

export interface ThunkAPI {
  state: RootState;
  rejectValue: ErrStatusT;
}
