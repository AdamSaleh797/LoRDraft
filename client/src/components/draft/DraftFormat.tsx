import React from 'react'

import {
  DraftFormat,
  GameMetadata,
  allDraftFormats,
} from 'common/game/metadata'

import { Button } from 'client/components/common/button'

interface DraftFormatComponentProps {
  select_format_fn: (draft_format: DraftFormat) => void
  gameMetadata: GameMetadata | null
}

export function DraftFormatComponent(props: DraftFormatComponentProps) {
  return (
    <div>
      {allDraftFormats().map((format) => (
        <Button
          key={format}
          onClick={() => {
            props.select_format_fn(format)
          }}
        >
          {props.gameMetadata !== null ? (
            <img src={props.gameMetadata.formats[format].imageUrl}></img>
          ) : (
            <div>{format}</div>
          )}
        </Button>
      ))}
    </div>
  )
}