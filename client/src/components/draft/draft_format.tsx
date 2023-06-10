import React from 'react'

import { DraftFormat } from 'draft'
import { Button } from '../button/button'

interface DraftFormatComponentProps {
  select_format_fn: (draft_format: DraftFormat) => void
}

export function DraftFormatComponent(props: DraftFormatComponentProps) {
  return (
    <div>
      <Button
        onClick={() => {
          props.select_format_fn(DraftFormat.STANDARD)
        }}
      >
        STANDARD
      </Button>
      <Button
        onClick={() => {
          props.select_format_fn(DraftFormat.ETERNAL)
        }}
      >
        ETERNAL
      </Button>
    </div>
  )
}
