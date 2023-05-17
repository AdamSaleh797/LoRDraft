import React from 'react'

import { Buffer } from 'buffer'

import { SessionCred } from 'socket-msgs'
import { DraftFormat, DraftOptions } from 'draft'

interface DraftFormatComponentProps {
  select_format_fn: (draft_format: DraftFormat) => void
}

export function DraftFormatComponent(props: DraftFormatComponentProps) {
  return (
    <div>
      <button
        onClick={() => {
          props.select_format_fn(DraftFormat.STANDARD)
        }}
      >
        STANDARD
      </button>
      <button
        onClick={() => {
          props.select_format_fn(DraftFormat.ETERNAL)
        }}
      >
        ETERNAL
      </button>
    </div>
  )
}
