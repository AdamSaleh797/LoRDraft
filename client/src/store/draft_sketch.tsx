import { PayloadAction, createSlice } from '@reduxjs/toolkit'

import { Card, cardComparator } from 'common/game/card'
import { DraftDeck, copyDraftDeck } from 'common/game/draft'
import { addCardToDeck } from 'common/game/draft'

import { RootState } from 'client/store'

export interface DraftSketch {
  /**
   * The sketch deck, which reflects the current deck with `addedCards`
   * inserted.
   */
  deck: DraftDeck

  /**
   * A reference to the original `DraftDeck` that this sketch is based off of.
   */
  readonly originalDeck: DraftDeck

  /**
   * A list of cards that have been added to this draft deck.
   */
  addedCards: Card[]
}

type DraftSketchMap = Record<number, DraftSketch>

const initialState: DraftSketchMap = {}

const draftSketchesSlice = createSlice({
  name: 'draftSketches',
  initialState,
  reducers: {
    initializeDraftSketch: (
      state,
      { payload: { id, deck } }: PayloadAction<{ id: number; deck: DraftDeck }>
    ) => {
      state[id] = {
        deck: deck,
        originalDeck: deck,
        addedCards: [],
      }
    },
    addCardToSketch: (
      state,
      { payload: { id, card } }: PayloadAction<{ id: number; card: Card }>
    ) => {
      const deck = state[id].deck
      if (addCardToDeck(deck, card)) {
        state[id].addedCards.push(card)
      }
    },
    removeCardFromSketch: (
      state,
      { payload: { id, card } }: PayloadAction<{ id: number; card: Card }>
    ) => {
      const idx = state[id].addedCards.findIndex((added_card) =>
        cardComparator(card, added_card)
      )
      if (idx === -1) {
        return
      }

      const added_cards = state[id].addedCards.slice()
      added_cards.splice(idx, 1)

      // Copy the deck and re-insert all remaining added cards.
      const deck = copyDraftDeck(state[id].originalDeck)
      if (
        added_cards.some((card) => {
          // If any card can't be added for some reason, terminate the loop
          // early.
          return !addCardToDeck(deck, card)
        })
      ) {
        // Reset the draft sketch. This should never happen, since addedCards
        // have already been verified to fit in the deck, so any subset of them
        // should also fit. But keep this as a failsafe.
        state[id].addedCards = []
        state[id].deck = state[id].originalDeck
        return
      }

      state[id].addedCards = added_cards
      state[id].deck = deck
    },
  },
})

export function selectDraftSketch(state: RootState, id: number) {
  return state.draftSketches[id]
}

export const { initializeDraftSketch, addCardToSketch, removeCardFromSketch } =
  draftSketchesSlice.actions

export default draftSketchesSlice.reducer
