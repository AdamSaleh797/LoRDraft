export const POOL_SIZE = 4

export const enum DraftState {
  INIT = 'INIT',
  INITIAL_SELECTION = 'INITIAL_SELECTION',
  RANDOM_SELECTION_1 = 'RANDOM_SELECTION_1',
  CHAMP_ROUND_1 = 'CHAMP_ROUND_1',
  RANDOM_SELECTION_2 = 'RANDOM_SELECTION_2',
  CHAMP_ROUND_2 = 'CHAMP_ROUND_2',
  RANDOM_SELECTION_3 = 'RANDOM_SELECTION_3',
  CHAMP_ROUND_3 = 'CHAMP_ROUND_3',
  TRIM_DECK = 'TRIM_DECK',
  GENERATE_CODE = 'GENERATE_CODE',
}

export function draftStateCardLimits(draftState: DraftState): [number, number] {
  switch (draftState) {
    case DraftState.INITIAL_SELECTION: {
      return [2, 2]
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      return [1, 1]
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2:
    case DraftState.CHAMP_ROUND_3: {
      return [0, 2]
    }
    case DraftState.TRIM_DECK: {
      return [5, 5]
    }
    case DraftState.INIT:
    case DraftState.GENERATE_CODE: {
      return [0, 0]
    }
  }
}
