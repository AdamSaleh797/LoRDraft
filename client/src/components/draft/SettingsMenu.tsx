import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { Button as MButton, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import * as React from 'react';

import { DraftDeck } from 'common/game/draft';
import { DraftOptions } from 'common/game/draft_options';

import { Button } from 'client/components/common/button';
import { ModeSelection } from 'client/components/draft/ModeSelection';
import SettingChangeWarning from 'client/components/draft/SettingChangeWarning';

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function SettingsMenu(props: {
  setOptions: (options: DraftOptions) => void;
  deck: DraftDeck;
}) {
  const [open, setOpen] = React.useState(false);
  const [openWarning, setOpenWarning] = React.useState(false);
  const [format, setFormat] = React.useState(props.deck.options.draftFormat);
  const [rarity, setRarity] = React.useState(
    props.deck.options.rarityRestriction
  );

  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const acceptChanges = () => {
    handleClose();
    setOpenWarning(false);
    props.setOptions({ draftFormat: format, rarityRestriction: rarity });
  };

  const declineChanges = () => {
    setOpenWarning(false);
  };

  return (
    <div>
      <Button onClick={handleOpen}>
        <SettingsIcon />
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby='options'
        aria-describedby='options'
      >
        <Box sx={style} display='flex' flexDirection='column'>
          <Box
            display='flex'
            flexDirection='row'
            marginBottom='40px'
            justifyContent='space-between'
          >
            <Box display='flex'>
              <Typography variant='h5'>Settings</Typography>
            </Box>
            <Box display='flex'>
              <MButton onClick={handleClose}>
                <CloseIcon />
              </MButton>
            </Box>
          </Box>
          <ModeSelection
            setFormat={setFormat}
            setRarity={setRarity}
            currentFormat={format}
            currentRarity={rarity}
          />
          <Box display='flex' justifyContent='right' marginTop='40px'>
            <Button
              onClick={() => {
                setOpenWarning(true);
              }}
            >
              OK
            </Button>
            {openWarning ? (
              <SettingChangeWarning
                accept={acceptChanges}
                decline={declineChanges}
              />
            ) : null}
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
