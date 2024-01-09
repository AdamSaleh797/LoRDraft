import CloseIcon from '@mui/icons-material/Close';
import { Button as MButton, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import * as React from 'react';

import { Button } from 'client/components/common/button';

const style = {
  position: 'absolute' as 'const',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '40%',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function Rules() {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button onClick={handleOpen}>Rules</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby='modal-modal-title'
        aria-describedby='modal-modal-description'
      >
        <Box sx={style}>
          <Box display='flex' justifyContent='space-between'>
            <Box marginTop='10px'>
              <Typography variant='h6' component='h2'>
                Welcome to Draft Runeterra!
              </Typography>
            </Box>
            <MButton onClick={handleClose}>
              <CloseIcon />
            </MButton>
          </Box>
          <Typography id='modal-modal-description' sx={{ mt: 2 }} paragraph>
            This is a free to use website that allows fans of Riot Games'
            trading card game, Legends of Runeterra, to draft a deck! <br />
            <br />
            We provide you with card options to build a deck from that are
            selected based on controlled-randomness. The card pool will change
            based on the mode. It's the best way to test your deck building
            skills against your friends!
            <br />
            <br />
            The rules are simple:
            <ul>
              <li> Follow the instructions to the right. </li>
              <li> Press confirm to add cards to your deck. </li>
              <li>
                Copy the deck code, and trim the deck in Legends of Runeterra.
              </li>
            </ul>
            <br />
            Press the settings button on to top left to check out different
            drafting modes!
          </Typography>
        </Box>
      </Modal>
    </div>
  );
}
