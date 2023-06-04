import React from 'react'

import {
  DraftOptions,
  DraftFormat,
  DraftRarityRestriction,
} from 'draft_options'
import { StateMachine } from 'state_machine'
import { DraftFormatComponent } from './draft_format'
import { DraftRarityRestrictionComponent } from './draft_rarity_restriction'
import { isOk } from 'lor_util'

interface DraftOptionsComponentProps {
  join_draft_fn: (draft_options: DraftOptions) => void
}

const enum SelectionState {
  SELECT_FORMAT = 'SELECT_FORMAT',
  SELECT_RARITY = 'SELECT_RARITY',
  FINISH_SELECTION = 'FINISH_SELECTION',
}

const machine_def = {
  [SelectionState.SELECT_FORMAT]: {
    [SelectionState.SELECT_RARITY]: (_: null, draft_format: DraftFormat) => {
      console.log('format -> rarity')
      return {
        draftFormat: draft_format,
      }
    },
  },
  [SelectionState.SELECT_RARITY]: {
    [SelectionState.FINISH_SELECTION]: (
      opts: Pick<DraftOptions, 'draftFormat'>,
      rarity_restriction: DraftRarityRestriction
    ) => {
      console.log('finishing up')
      return {
        rarityRestriction: rarity_restriction,
        ...opts,
      }
    },
  },
  [SelectionState.FINISH_SELECTION]: {},
} as const

export function DraftOptionsComponent(props: DraftOptionsComponentProps) {
  const [selectionState, setSelectionState] = React.useState<SelectionState>(
    SelectionState.SELECT_FORMAT
  )

  const stateMachineRef = React.useRef(
    StateMachine.makeStateMachine(
      machine_def,
      SelectionState.SELECT_FORMAT,
      null,
      setSelectionState as (_: SelectionState) => void
    )
  )

  switch (selectionState) {
    case SelectionState.SELECT_FORMAT: {
      return (
        <DraftFormatComponent
          select_format_fn={(draft_format) => {
            stateMachineRef.current.transition(
              SelectionState.SELECT_FORMAT,
              SelectionState.SELECT_RARITY,
              draft_format
            )
          }}
        />
      )
    }
    case SelectionState.SELECT_RARITY: {
      return (
        <DraftRarityRestrictionComponent
          select_rarity_restriction_fn={(rarity_restriction) => {
            stateMachineRef.current.transition(
              SelectionState.SELECT_RARITY,
              SelectionState.FINISH_SELECTION,
              rarity_restriction
            )
          }}
        />
      )
    }
    case SelectionState.FINISH_SELECTION: {
      const draft_options = stateMachineRef.current.state_prop_exact(
        SelectionState.FINISH_SELECTION
      )
      if (!isOk(draft_options)) {
        console.log(draft_options)
        return <div></div>
      }
      props.join_draft_fn(draft_options.value)
      return <div></div>
    }
  }
}
