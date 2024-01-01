import { Grid } from '@mui/material';
import React from 'react';

import style from './header.module.css';

import { ModeSelection } from 'client/components/draft/ModeSelection';
import { APP_TITLE } from 'client/utils/constants';

export function Header() {
  return (
    <div className={style.header}>
      <Grid>
        <Grid item xs={6}>
          <div className={style.leftElement}>
            <ModeSelection />
          </div>
        </Grid>
        <Grid item xs={6}>
          {APP_TITLE}
        </Grid>
      </Grid>
    </div>
  );
}
