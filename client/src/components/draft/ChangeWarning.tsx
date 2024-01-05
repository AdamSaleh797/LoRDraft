import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import React from 'react';

import { Button } from 'client/components/common/button';

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 450,
  bgcolor: 'background.paper',
  p: 4,
};

export default function ChangeWarning(props: {
  flavorText: string;
  open: boolean;
  accept: () => void;
  decline: () => void;
}) {
  return (
    <div>
      <Modal
        open={props.open}
        aria-labelledby='setting-change-warning'
        aria-describedby='setting-change-warning'
      >
        <Box sx={style} display='flex' flexDirection='column'>
          <Box display='flex' marginBottom='50px'>
            <Typography variant='h6'>{props.flavorText}</Typography>
          </Box>
          <Box display='flex' justifyContent='space-between'>
            <Button onClick={props.decline}>No</Button>
            <Button onClick={props.accept}>Yes</Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
