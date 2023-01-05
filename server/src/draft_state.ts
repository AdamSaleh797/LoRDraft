import { Card, Region } from 'card'
import { OkStatus, randChoice, Status } from 'lor_util'
import { regionSets } from 'set_packs'
import { StateMachine } from 'state_machine'

const enum DraftStates {
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

interface DraftDeck {
  regions: Region[]
  cards: Card[]
}
const draft_states_def = {
  [DraftStates.INITIAL_SELECTION]: {
    [DraftStates.RANDOM_SELECTION_1]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.RANDOM_SELECTION_1]: {
    [DraftStates.CHAMP_ROUND_1]: (draft: DraftDeck) => {
      return
    },
    [DraftStates.RANDOM_SELECTION_1]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.CHAMP_ROUND_1]: {
    [DraftStates.RANDOM_SELECTION_2]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.RANDOM_SELECTION_2]: {
    [DraftStates.CHAMP_ROUND_2]: (draft: DraftDeck) => {
      return
    },
    [DraftStates.RANDOM_SELECTION_2]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.CHAMP_ROUND_2]: {
    [DraftStates.RANDOM_SELECTION_3]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.RANDOM_SELECTION_3]: {
    [DraftStates.CHAMP_ROUND_3]: (draft: DraftDeck) => {
      return
    },
    [DraftStates.RANDOM_SELECTION_3]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.CHAMP_ROUND_3]: {
    [DraftStates.TRIM_DECK]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.TRIM_DECK]: {
    [DraftStates.GENERATE_CODE]: (draft: DraftDeck) => {
      return
    },
  },
  [DraftStates.GENERATE_CODE]: {},
} as const

const draft_states = new StateMachine(
  draft_states_def,
  DraftStates.INITIAL_SELECTION as DraftStates
)

export function randomNonChampCards(
  deck: DraftDeck,
  callback: (status: Status, card: Card | null) => void
): void {
  const region = randChoice(deck.regions)
  regionSets((status, region_sets) => {
    if (status !== null || region_sets === null) {
      callback(status, null)
      return
    }
    callback(OkStatus, randChoice(region_sets[region].nonChamps))
  })
}
