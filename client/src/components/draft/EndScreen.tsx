import { Grid } from '@mui/material';
import { Box } from '@mui/system';
import React from 'react';

import { CARDS_PER_DECK, DraftStateInfo, getDeckCode } from 'common/game/draft';
import { GameMetadata } from 'common/game/metadata';
import { AuthInfo, LoRDraftClientSocket } from 'common/game/socket-msgs';
import { isOk } from 'common/util/status';

import { CopyButton } from 'client/components/draft/CopyButton';
import { DeckList } from 'client/components/draft/DeckList';
import { ManaCurve } from 'client/components/draft/ManaCurve';
import { RestartButton } from 'client/components/draft/RestartButton';
import { DraftSketch } from 'client/context/draft/draft_sketch';

interface EndScreenProps {
  socket: LoRDraftClientSocket;
  authInfo: AuthInfo;
  draftState: DraftStateInfo;
  gameMetadata: GameMetadata | null;
}

export function EndScreen(props: EndScreenProps) {
  let deckCode: string | null;
  if (props.draftState.deck.numCards >= CARDS_PER_DECK) {
    const code = getDeckCode(props.draftState.deck);
    if (!isOk(code)) {
      deckCode = null;
    } else {
      deckCode = code.value;
    }
  } else {
    deckCode = null;
  }

  return (
    <Grid container>
      <Grid xs={9} padding={1}>
        <DeckList
          draftState={props.draftState}
          draftSketch={new DraftSketch(props.draftState.deck)}
          gameMetadata={props.gameMetadata}
        ></DeckList>
      </Grid>
      <Grid xs={3} padding={4} marginTop='35px'>
        <Box display='flex' flexDirection='column'>
          <Box>
            <ManaCurve draftSketch={new DraftSketch(props.draftState.deck)} />
          </Box>
          <Box display='flex' justifyContent='space-between' marginTop='10px'>
            <CopyButton
              textToCopy={deckCode === null ? '' : deckCode}
              buttonText='COPY DECK CODE'
            ></CopyButton>
            <RestartButton
              socket={props.socket}
              authInfo={props.authInfo}
              draftState={props.draftState}
            />
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
