import { ContentCopy } from '@mui/icons-material';
import { Button, Snackbar } from '@mui/material';
import clipboardCopy from 'clipboard-copy';
import React from 'react';

export interface CopyButtonProps {
  textToCopy: string;
  buttonText: string;
}

export function CopyButton(props: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    console.log('handling copy');
    clipboardCopy(props.textToCopy);
    setIsCopied(true);
  };

  const handleSnackbarClose = () => {
    setIsCopied(false);
  };

  return (
    <div>
      <Button
        variant='contained'
        color='primary'
        onClick={handleCopy}
        startIcon={<ContentCopy />}
      >
        {props.buttonText}
      </Button>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        open={isCopied}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message='Copied to clipboard!'
      />
    </div>
  );
}
