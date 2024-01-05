import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import React from 'react';

import {
  DraftRarityRestriction,
  allRarityRestrictions,
  rarityDisplayName,
} from 'common/game/draft_options';
import { DraftFormat, allDraftFormats } from 'common/game/metadata';

export function ModeSelection(props: {
  setFormat: (format: DraftFormat) => void;
  setRarity: (rarity: DraftRarityRestriction) => void;
  currentFormat: DraftFormat;
  currentRarity: DraftRarityRestriction;
}) {
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
                label='Mode'
                value={props.currentFormat}
                onChange={(event) => {
                  props.setFormat(event.target.value as DraftFormat);
                }}
              >
                {allDraftFormats().map((format) => (
                  <MenuItem key={format} value={format}>
                    {format}
                  </MenuItem>
                ))}
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
                label='Rarity'
                value={props.currentRarity}
                onChange={(event) => {
                  props.setRarity(event.target.value as DraftRarityRestriction);
                }}
              >
                {allRarityRestrictions().map((rarity) => (
                  <MenuItem key={rarity} value={rarity}>
                    {rarityDisplayName(rarity)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
