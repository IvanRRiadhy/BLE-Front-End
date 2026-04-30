import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography, Switch, FormControlLabel } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { useDispatch } from 'src/store/Store';
import { fetchReaderHealth } from 'src/store/apps/tracking/ReaderHealth';
import ReaderHealthReportList from 'src/components/master/Reports/ReaderHealthReport/ReaderHealthReportList';
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch';

const ReaderHealthReport = () => {
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('table');

  useEffect(() => {
    const unsubscribe = dispatch(fetchReaderHealth());
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [dispatch]);

  return (
    <PageContainer title="Reader Health Report" description="Monitoring health status of readers">
      <AppCard>
        <Box sx={{ p: 3, width: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">Reader Health Report</Typography>
            <FormControlLabel
              control={
                <CustomSwitch
                  checked={viewMode === 'table'}
                  onChange={(e: any) => setViewMode(e.target.checked ? 'table' : 'visual')}
                  color="primary"
                />
              }
              label={viewMode === 'table' ? 'Table List' : 'Chart List'}
            />
          </Stack>
          
          <ReaderHealthReportList viewMode={viewMode} />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default ReaderHealthReport;


