import React from 'react';
import { Box } from '@mui/material';
import DetailList from './DetailList';
import TimerButton from './TimerButton';
import GraphDisplay from './GraphDisplay';

const Evacuation: React.FC = () => (
  <Box
    minHeight="80vh"
    width="100%"
    display="flex"
    alignItems="center"
    justifyContent="center"
    gap={2}
    bgcolor="background.default"
    p={2}
  >
    <DetailList />
    <TimerButton />
    <GraphDisplay />
  </Box>
);

export default Evacuation;
