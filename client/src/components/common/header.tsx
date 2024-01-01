import { Grid } from '@mui/material';
import React from 'react';

import style from './header.module.css';

import { ModeSelection } from 'client/components/draft/ModeSelection';
import { APP_TITLE } from 'client/utils/constants';

export function Header() {
  return (
    <div className={style.header}>
      <Grid container spacing={2}>
        <Grid item xs={3}>
          <ModeSelection />
        </Grid>
        <Grid item xs={9} justifyContent='center' alignContent='center'>
          {APP_TITLE}
        </Grid>
      </Grid>
    </div>
  );
}
