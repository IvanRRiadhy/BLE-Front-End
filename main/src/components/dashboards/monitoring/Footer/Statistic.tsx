import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  getAllBuildings,
  getAllFloors,
  getAllFloorplans,
  getAllAreas,
  fetchCountingData,
} from 'src/store/apps/tracking/Beacon';

const Statistic = () => {
  // Get real data from Redux store using the helper functions
  const buildingData = useSelector((state: RootState) => getAllBuildings(state));
  const floorData = useSelector((state: RootState) => getAllFloors(state));
  const floorplanData = useSelector((state: RootState) => getAllFloorplans(state));
  const areaData = useSelector((state: RootState) => getAllAreas(state));

  // Get the counting data to check if it's available
  const countingData = useSelector((state: RootState) => state.BeaconReducer.countingData);
  const dispatch = useDispatch();

  useEffect(() => {
    // Subscribe to counting data when component mounts
    const unsubscribe = dispatch(fetchCountingData());

    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);
  // Component for individual statistic table
  const StatisticTable = ({
    title,
    data,
  }: {
    title: string;
    data: Array<{ id: string; name: string; count: number }>;
  }) => (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, textAlign: 'center' }}>
        {title} ({data.length})
      </Typography>
      <TableContainer
        component={Paper}
        sx={{
          flex: 1,
          maxHeight: '200px',
          overflow: 'auto',
          '& .MuiTableCell-root': {
            padding: '8px 16px',
            fontSize: '0.875rem',
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Count
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.name || 'Unnamed'}</TableCell>
                  <TableCell align="right">{item.count}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Show loading state if no counting data yet
  if (!countingData) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <Typography variant="body1">Loading counting data...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        p: 1,
      }}
    >
      <StatisticTable title="Building" data={buildingData} />
      <StatisticTable title="Floor" data={floorData} />
      <StatisticTable title="Floorplan" data={floorplanData} />
      <StatisticTable title="Area" data={areaData} />
    </Box>
  );
};

export default Statistic;
