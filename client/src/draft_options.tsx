import React from 'react'

import { Buffer } from 'buffer'

import { SessionCred } from 'socket-msgs'
import { DraftFormat, DraftOptions } from 'draft'
import { StateMachine } from 'state_machine'
import { DraftFormatComponent } from './draft_format'
import { DraftRarityRestrictionComponent } from './draft_rarity_restriction'

interface DraftOptionsComponentProps {
  join_draft_fn: (draft_options: DraftOptions) => void
}

const enum SelectionState {
  SELECT_FORMAT = 'SELECT_FORMAT',
  SELECT_RARITY = 'SELECT_RARITY',
}

const machine_def = {
  [SelectionState.SELECT_FORMAT]: {
    [SelectionState.SELECT_RARITY]: () => {
      console.log('format -> rarity')
    },
  },
  [SelectionState.SELECT_RARITY]: {},
} as const

export function DraftOptionsComponent(props: DraftOptionsComponentProps) {
  const [selectionState, setSelectionState] = React.useState<SelectionState>(
    SelectionState.SELECT_FORMAT
  )

  const [draftOptions, setDraftOptions] = React.useState<Partial<DraftOptions>>(
    {}
  )

  const selection_state_machine = new StateMachine(
    machine_def,
    selectionState,
    setSelectionState
  )

  switch (selectionState) {
    case SelectionState.SELECT_FORMAT: {
      return (
        <DraftFormatComponent
          select_format_fn={(draft_format) => {
            setDraftOptions({
              draftFormat: draft_format,
              ...draftOptions,
            })
            selection_state_machine.transition(
              SelectionState.SELECT_FORMAT,
              SelectionState.SELECT_RARITY
            )
          }}
        />
      )
    }
    case SelectionState.SELECT_RARITY: {
      return (
        <DraftRarityRestrictionComponent
          select_rarity_restriction_fn={(rarity_restriction) => {
            const draft_options = {
              rarityRestriction: rarity_restriction,
              ...draftOptions,
            } as DraftOptions
            props.join_draft_fn(draft_options)
          }}
        />
      )
    }
  }

  return <div>{}</div>
}
