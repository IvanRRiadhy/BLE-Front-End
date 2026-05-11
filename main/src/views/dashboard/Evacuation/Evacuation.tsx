import React from 'react';
import { Box } from '@mui/material';
import DetailList from './DetailList';
import TimerButton from './TimerButton';
import GraphDisplay from './GraphDisplay';

const Evacuation: React.FC = () => (
  <Box
    sx={{
      height: '90vh',
      width: '100%',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: 0,
      bgcolor: 'background.default',
      p: 2,
      overflow: 'hidden',
    }}
  >
    <DetailList />
    <TimerButton />
    <GraphDisplay />
  </Box>
);

export default Evacuation;
