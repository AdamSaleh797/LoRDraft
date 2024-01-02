import { DeepReadonly } from 'ts-essentials';

import { Card } from 'common/game/card';
import {
  DraftDeck,
  DraftState,
  DraftStateInfo,
  POOL_SIZE,
  RANDOM_SELECTION_1_CARD_CUTOFF,
  RANDOM_SELECTION_2_CARD_CUTOFF,
  RANDOM_SELECTION_3_CARD_CUTOFF,
  addCardsToDeck,
  draftStateCardLimits,
  makeDraftDeck,
} from 'common/game/draft';
import { DraftOptions, DraftOptionsT } from 'common/game/draft_options';
import { CardListT, LoRDraftSocket } from 'common/game/socket-msgs';
import { intersectListsPred } from 'common/util/lor_util';
import {
  Status,
  StatusCode,
  isOk,
  makeErrStatus,
  makeOkStatus,
} from 'common/util/status';

import { joinSession } from 'server/auth';
import {
  CardType,
  SampleMode,
  SelectionMode,
  randomSampleCards,
} from 'server/card_pool';
import {
  SessionInfo,
  exitDraft,
  getDraftState,
  inDraft,
  updateDraft,
} from 'server/store/usermap';

// out of 1
const REGION_WEIGHTED_CHANCE = 0.35;

const GUARANTEED_CHAMP_COUNT = 2;
const RESTRICTED_POOL_DRAFT_STATES = [
  DraftState.CHAMP_ROUND_1,
  DraftState.CHAMP_ROUND_2,
  DraftState.CHAMP_ROUND_3,
];

async function chooseChampCards(
  draft_state: DraftState,
  deck: DraftDeck,
  allow_same_region = true
): Promise<Status<Card[]>> {
  const num_guaranteed_champs = RESTRICTED_POOL_DRAFT_STATES.includes(
    draft_state
  )
    ? GUARANTEED_CHAMP_COUNT
    : 0;

  const status = await randomSampleCards({
    cardType: CardType.CHAMP,
    selectionMode: SelectionMode.FROM_DECK,
    allowSameRegion: allow_same_region,
    numCards: num_guaranteed_champs,
    deck: deck,
  });
  if (!isOk(status)) {
    return status;
  }
  const guaranteed_cards = status.value;

  const status2 = await randomSampleCards({
    cardType: CardType.CHAMP,
    allowSameRegion: allow_same_region,
    numCards: POOL_SIZE - guaranteed_cards.length,
    deck: deck,
    restrictionPool: guaranteed_cards,
  });
  if (!isOk(status2)) {
    return status2;
  }

  return makeOkStatus(guaranteed_cards.concat(status2.value));
}

async function chooseNonChampCards(deck: DraftDeck): Promise<Status<Card[]>> {
  return await randomSampleCards({
    cardType: CardType.NON_CHAMP,
    sampleMode:
      Math.random() < REGION_WEIGHTED_CHANCE
        ? SampleMode.REGION_WEIGHTED
        : SampleMode.UNIFORM,
    numCards: POOL_SIZE,
    deck: deck,
  });
}

/**
 * Returns the next draft state, depending on the current state and the size of
 * the deck.
 */
function nextDraftState(state: DraftState, deck: DraftDeck): DraftState | null {
  switch (state) {
    case DraftState.INIT:
      return DraftState.INITIAL_SELECTION;
    case DraftState.INITIAL_SELECTION:
      return DraftState.RANDOM_SELECTION_1;
    case DraftState.RANDOM_SELECTION_1:
      if (deck.numCards < RANDOM_SELECTION_1_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_1;
      } else {
        return DraftState.CHAMP_ROUND_1;
      }
    case DraftState.CHAMP_ROUND_1:
      return DraftState.RANDOM_SELECTION_2;
    case DraftState.RANDOM_SELECTION_2:
      if (deck.numCards < RANDOM_SELECTION_2_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_2;
      } else {
        return DraftState.CHAMP_ROUND_2;
      }
    case DraftState.CHAMP_ROUND_2:
      return DraftState.RANDOM_SELECTION_3;
    case DraftState.RANDOM_SELECTION_3:
      if (deck.numCards < RANDOM_SELECTION_3_CARD_CUTOFF) {
        return DraftState.RANDOM_SELECTION_3;
      } else {
        return DraftState.CHAMP_ROUND_3;
      }
    case DraftState.CHAMP_ROUND_3:
      //return DraftState.TRIM_DECK
      //case DraftState.TRIM_DECK:
      return DraftState.GENERATE_CODE;
    case DraftState.GENERATE_CODE:
      return null;
  }
}

/**
 * Chooses the next set of cards for draft state `draft_state`, adding the
 * chosen cards to the `pending_cards` and returning the new draft state.
 */
async function chooseNextCards(
  draft_state: DeepReadonly<DraftStateInfo>
): Promise<Status<DraftStateInfo>> {
  const cur_state = draft_state.state;
  const next_draft_state = nextDraftState(cur_state, draft_state.deck);
  if (next_draft_state === null) {
    return makeErrStatus(
      StatusCode.DRAFT_COMPLETE,
      'The draft is complete, no more card selections to be made.'
    );
  }

  if (next_draft_state === DraftState.GENERATE_CODE) {
    // If the selection phase is complete, don't choose more pending cards.
    return makeOkStatus({
      ...draft_state,
      pendingCards: [],
      state: next_draft_state,
    });
  }

  let next_cards_status;
  switch (next_draft_state) {
    case DraftState.INIT: {
      return makeErrStatus(
        StatusCode.INTERNAL_SERVER_ERROR,
        'Cannot have next draft state be `INIT`.'
      );
    }
    case DraftState.INITIAL_SELECTION: {
      next_cards_status = await chooseChampCards(
        next_draft_state,
        draft_state.deck,
        /*allow_same_region=*/ false
      );
      break;
    }
    case DraftState.CHAMP_ROUND_1:
    case DraftState.CHAMP_ROUND_2:
    case DraftState.CHAMP_ROUND_3: {
      next_cards_status = await chooseChampCards(
        next_draft_state,
        draft_state.deck
      );
      break;
    }
    case DraftState.RANDOM_SELECTION_1:
    case DraftState.RANDOM_SELECTION_2:
    case DraftState.RANDOM_SELECTION_3: {
      next_cards_status = await chooseNonChampCards(draft_state.deck);
      break;
    }
  }
  if (!isOk(next_cards_status)) {
    return next_cards_status;
  }

  const cards = next_cards_status.value;
  if (cards.length === 0) {
    // If no cards were chosen, move immediately to the next round. This should
    // only happen in champ rounds if there are no more champs left.
    return await chooseNextCards({
      ...draft_state,
      state: next_draft_state,
    });
  }

  return makeOkStatus({
    ...draft_state,
    pendingCards: cards,
    state: next_draft_state,
  });
}

export function initDraftState(socket: LoRDraftSocket) {
  socket.respond('current_draft', async (session_cred) => {
    const auth_user_status = joinSession(session_cred);
    if (!isOk(auth_user_status)) {
      return auth_user_status;
    }
    const auth_user = auth_user_status.value;

    return getDraftState(auth_user);
  });

  socket.respond('join_draft', async (session_cred, draft_options) => {
    if (!DraftOptionsT.guard(draft_options)) {
      return makeErrStatus(
        StatusCode.INCORRECT_MESSAGE_ARGUMENTS,
        `Argument \`draft_options\` to 'join_draft' is not of the correct type.`
      );
    }

    const status = joinSession(session_cred);
    if (!isOk(status)) {
      return status;
    }
    const auth_user = status.value;

    return await enterDraft(auth_user.sessionInfo, draft_options);
  });

  socket.respond('close_draft', async (session_cred) => {
    const status = joinSession(session_cred);
    if (!isOk(status)) {
      return status;
    }
    const auth_user = status.value;

    return exitDraft(auth_user.sessionInfo);
  });

  socket.respond('choose_cards', async (session_cred, cards) => {
    if (!CardListT.guard(cards)) {
      return makeErrStatus(
        StatusCode.INCORRECT_MESSAGE_ARGUMENTS,
        `Argument \`cards\` to 'choose_cards' is not of the correct type.`
      );
    }

    const status = joinSession(session_cred);
    if (!isOk(status)) {
      return status;
    }
    const auth_user = status.value;

    const draft_state_status = getDraftState(auth_user);
    if (!isOk(draft_state_status)) {
      return draft_state_status;
    }
    let draft_state = draft_state_status.value;

    if (draft_state.pendingCards.length === 0) {
      return makeErrStatus(
        StatusCode.NOT_WAITING_FOR_CARD_SELECTION,
        'Draft state is not currently waiting for pending cards from the client.'
      );
    }

    const min_max_cards = draftStateCardLimits(draft_state.state);
    if (min_max_cards === null) {
      return makeErrStatus(
        StatusCode.NOT_WAITING_FOR_CARD_SELECTION,
        'Draft state is not currently waiting for pending cards from the client.'
      );
    }
    const [min_cards, max_cards] = min_max_cards;

    if (cards.length < min_cards || cards.length > max_cards) {
      return makeErrStatus(
        StatusCode.INCORRECT_NUM_CHOSEN_CARDS,
        `Cannot choose ${cards.length} cards in state ${draft_state.state}, must choose from ${min_cards} to ${max_cards} cards`
      );
    }

    const chosen_cards = intersectListsPred(
      draft_state.pendingCards,
      cards,
      (pending_card, card) => pending_card.cardCode === card.cardCode
    );

    if (chosen_cards.length !== cards.length) {
      return makeErrStatus(
        StatusCode.NOT_PENDING_CARD,
        `Some chosen cards are not pending cards, or are duplicates.`
      );
    }

    // Add the chosen cards to the deck.
    const deck = addCardsToDeck(draft_state.deck, chosen_cards);
    if (deck === null) {
      return makeErrStatus(
        StatusCode.ILLEGAL_CARD_COMBINATION,
        'The cards could not be added to the deck'
      );
    }

    draft_state = {
      ...draft_state,
      deck,
    };

    const next_cards_status = await chooseNextCards(draft_state);
    if (!isOk(next_cards_status)) {
      return next_cards_status;
    }

    updateDraft(auth_user.sessionInfo, next_cards_status.value);
    return makeOkStatus(next_cards_status.value);
  });
}

export async function enterDraft(
  session_info: SessionInfo,
  draft_options: DraftOptions
): Promise<Status<DraftStateInfo>> {
  if (inDraft(session_info)) {
    return makeErrStatus(
      StatusCode.ALREADY_IN_DRAFT_SESSION,
      'Already in draft session siwwy'
    );
  }

  const init_draft_state = {
    state: DraftState.INIT,
    deck: makeDraftDeck(draft_options),
    pendingCards: [],
  };

  // Choose the first set of pending cards to show.
  const status = await chooseNextCards(init_draft_state);
  if (!isOk(status)) {
    return status;
  }

  const next_draft_state = status.value;

  // Since choose_next_cards is async, we need to check again that we're not
  // already in a draft. It's possible another request to join a draft
  // finished processing between when we last checked and now.
  if (inDraft(session_info)) {
    return makeErrStatus(
      StatusCode.ALREADY_IN_DRAFT_SESSION,
      'Already in draft session!'
    );
  }

  // If successful, join the draft by adding it to the session info.
  updateDraft(session_info, next_draft_state);
  return makeOkStatus(next_draft_state);
}
