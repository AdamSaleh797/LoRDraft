import { ButtonOwnProps, Button as MButton } from '@mui/material';
import React, { MouseEventHandler, ReactNode } from 'react';

import style from './button.module.css';

interface ButtonProps {
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  muiOps?: ButtonOwnProps;
}

export function Button(props: ButtonProps) {
  return (
    <MButton
      className={props.className ?? style.button}
      onClick={props.onClick}
      color='primary'
      variant='contained'
      {...props.muiOps}
    >
      {props.children}
    </MButton>
  );
}
