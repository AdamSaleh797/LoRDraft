import React from 'react'

import { DraftFormat, GameMetadata } from 'common/game/metadata'
import { LoRDraftClientSocket, SessionCred } from 'common/game/socket-msgs'

import { DraftFormatComponent } from 'client/components/draft/DraftFormat'
import { DraftRarityRestrictionComponent } from 'client/components/draft/DraftRarityRestriction'
import { doJoinDraftAsync } from 'client/store/draft'
import { useLoRDispatch } from 'client/store/hooks'

interface DraftOptionsComponentProps {
  socket: LoRDraftClientSocket
  authInfo: SessionCred
  gameMetadata: GameMetadata | null
}

export function DraftOptionsComponent(props: DraftOptionsComponentProps) {
  const [format, setFormat] = React.useState<DraftFormat | null>(null)
  const dispatch = useLoRDispatch()

  if (format === null) {
    return (
      <DraftFormatComponent
        select_format_fn={(draft_format) => {
          setFormat(draft_format)
        }}
        gameMetadata={props.gameMetadata}
      />
    )
  } else {
    return (
      <DraftRarityRestrictionComponent
        select_rarity_restriction_fn={(rarity_restriction) => {
          const draft_options = {
            draftFormat: format,
            rarityRestriction: rarity_restriction,
          }

          dispatch(
            doJoinDraftAsync({
              socket: props.socket,
              auth_info: props.authInfo,
              draft_options,
            })
          )
        }}
      />
    )
  }
}
