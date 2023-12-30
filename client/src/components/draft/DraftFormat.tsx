import React from 'react';

import {
  DraftFormat,
  GameMetadata,
  allDraftFormats,
} from 'common/game/metadata';

import { Button } from 'client/components/common/button';

interface DraftFormatComponentProps {
  selectFormatFn: (draft_format: DraftFormat) => void;
  gameMetadata: GameMetadata | null;
}

export function DraftFormatComponent(props: DraftFormatComponentProps) {
  return (
    <div>
      {allDraftFormats().map((format) => (
        <Button
          key={format}
          onClick={() => {
            props.selectFormatFn(format);
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
  );
}
