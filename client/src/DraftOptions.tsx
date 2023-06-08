import React from 'react'

import {
  DraftFormat,
  DraftOptions,
  DraftRarityRestriction,
} from 'game/draft_options'
import { StateMachine } from 'util/state_machine'
import { isOk } from 'util/status'

import { DraftFormatComponent } from './draft_format'
import { DraftRarityRestrictionComponent } from './draft_rarity_restriction'

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
      const status = stateMachineRef.current.state_prop_exact(
        SelectionState.FINISH_SELECTION
      )
      if (!isOk(status)) {
        console.log(status)
        return <div></div>
      }
      props.join_draft_fn(status.value)
      return <div></div>
    }
  }
}
