import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import React from 'react';

export function ModeSelection() {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth>
              <InputLabel id='mode-simple-select-label'>Mode</InputLabel>
              <Select
                labelId='mode-select-label'
                id='mode-select'
                //value={age}
                label='Mode'
                defaultValue={'Eternal'}
                //onChange={handleChange}
              >
                <MenuItem value={'Standard'}>Standard</MenuItem>
                <MenuItem value={'Eternal'}>Eternal</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <FormControl fullWidth>
              <InputLabel id='rarity-select-label'>Rarity</InputLabel>
              <Select
                labelId='rarity-select-label'
                id='rarity-select'
                //value={age}
                label='Rarity'
                defaultValue={'Any Rarity'}
                //onChange={handleChange}
              >
                <MenuItem value={'Any Rarity'}>Any Rarity</MenuItem>
                <MenuItem value={'Commons Only'}>Commons Only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
