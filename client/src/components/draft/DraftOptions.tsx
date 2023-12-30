import React from 'react';

import { DraftFormat, GameMetadata } from 'common/game/metadata';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';

import { DraftFormatComponent } from 'client/components/draft/DraftFormat';
import { DraftRarityRestrictionComponent } from 'client/components/draft/DraftRarityRestriction';
import { doJoinDraftAsync } from 'client/store/draft';
import { useLoRDispatch } from 'client/store/hooks';

interface DraftOptionsComponentProps {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
  gameMetadata: GameMetadata | null;
}

export function DraftOptionsComponent(props: DraftOptionsComponentProps) {
  const [format, setFormat] = React.useState<DraftFormat | null>(null);
  const dispatch = useLoRDispatch();

  if (format === null) {
    return (
      <DraftFormatComponent
        selectFormatFn={(draft_format) => {
          setFormat(draft_format);
        }}
        gameMetadata={props.gameMetadata}
      />
    );
  } else {
    return (
      <DraftRarityRestrictionComponent
        selectRarityRestrictionFn={(rarity_restriction) => {
          const draft_options = {
            draftFormat: format,
            rarityRestriction: rarity_restriction,
          };

          dispatch(
            doJoinDraftAsync({
              socket: props.socket,
              authInfo: props.authInfo,
              draftOptions: draft_options,
            })
          );
        }}
      />
    );
  }
}
