import React, { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  FormControlLabel,
  Grid2 as Grid,
  CardContent,
  CircularProgress,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { useDispatch, useSelector } from 'src/store/Store';
import { fetchReaderHealth } from 'src/store/apps/tracking/ReaderHealth';
import ReaderHealthReportList from 'src/components/master/Reports/ReaderHealthReport/ReaderHealthReportList';
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch';
import { useGMACList, bleReaderGmacType } from 'src/hooks/useReader';
import ReaderHealthReportExport from 'src/components/master/Reports/ReaderHealthReport/ReaderHealthReportExport';

const ReaderHealthReport = () => {
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('table');
  const readerHealthByTopic = useSelector((state) => state.ReaderHealthReducer.readerHealthByTopic);
  const { data: readersResponse, isLoading: isReadersLoading } = useGMACList();
  const allReader = readersResponse || [];

  useEffect(() => {
    const unsubscribe = dispatch(fetchReaderHealth());
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [dispatch]);

  const consolidatedData = React.useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    return allReader.map((reader: bleReaderGmacType) => {
      const health =
        readerHealthByTopic[reader.gmac] ||
        readerHealthByTopic[reader.gmac.toLowerCase()] ||
        readerHealthByTopic[reader.gmac.toUpperCase()];

      let status = 'Non-Active';
      if (health && health.utc >= oneMinuteAgo) {
        status = health.msg || 'alive';
      }

      return {
        ...health,
        gmac: reader.gmac,
        wanIP: reader.ip || health?.wanIP || '-',
        msg: status,
        temp: status === 'Non-Active' ? 0 : (health?.temp ?? 0),
        load: status === 'Non-Active' ? 0 : (health?.load ?? 0),
        mem_free: status === 'Non-Active' ? 0 : (health?.mem_free ?? 0),
        uptime: status === 'Non-Active' ? 0 : (health?.uptime ?? 0),
        ver: health?.ver || '-',
        blever: health?.blever || '-',
        lowVoltage: health?.lowVoltage ?? 0,
        utc: health?.utc ?? 0,
      };
    });
  }, [allReader, readerHealthByTopic]);

  const stats = React.useMemo(() => {
    let active = 0;
    let overheating = 0;
    let cpuOverload = 0;
    let memFull = 0;
    let totalWarning = 0;

    consolidatedData.forEach((item: any) => {
      if (item.msg !== 'Non-Active') {
        active++;
        let hasWarning = false;
        if (item.temp >= 50) {
          overheating++;
          hasWarning = true;
        }
        if (item.load >= 0.6) {
          cpuOverload++;
          hasWarning = true;
        }
        if (item.mem_free <= 15) {
          memFull++;
          hasWarning = true;
        }
        if (hasWarning) totalWarning++;
      }
    });

    return {
      total: allReader.length,
      active,
      totalWarning,
      overheating,
      cpuOverload,
      memFull,
    };
  }, [allReader.length, consolidatedData]);

  const cardData = [
    { title: 'Total Registered Reader', value: stats.total, color: 'primary' },
    { title: 'Total Active Reader', value: stats.active, color: 'success' },
    { title: 'Total Reader Warning', value: stats.totalWarning, color: 'warning' },
    { title: 'Total Overheating Reader', value: stats.overheating, color: 'error' },
    { title: 'Total CPU Overload Reader', value: stats.cpuOverload, color: 'error' },
    { title: 'Total Memory Full Reader', value: stats.memFull, color: 'error' },
  ];

  return (
    <PageContainer title="People Tracking System" description="Monitoring health status of readers">
      <Grid container spacing={3} mb={3}>
        {cardData.map((card, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4, lg: 2 }}>
            <Box bgcolor={card.color + '.light'} textAlign="center" borderRadius="12px">
              <CardContent>
                <Typography color={card.color + '.dark'} variant="subtitle2" fontWeight={600} fontSize={12}>
                  {card.title}
                </Typography>
                {isReadersLoading ? (
                  <CircularProgress size={20} sx={{ mt: 1, color: card.color + '.main' }} />
                ) : (
                  <Typography color={card.color + '.main'} variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                    {card.value}
                  </Typography>
                )}
              </CardContent>
            </Box>
          </Grid>
        ))}
      </Grid>
      <AppCard>
        <Box sx={{ p: 3, width: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">Reader Health Report</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <ReaderHealthReportExport data={consolidatedData} />
              {/* <FormControlLabel
                control={
                  <CustomSwitch
                    checked={viewMode === 'table'}
                    onChange={(e: any) => setViewMode(e.target.checked ? 'table' : 'visual')}
                    color="primary"
                  />
                }
                label={viewMode === 'table' ? 'Table List' : 'Chart List'}
              /> */}
            </Stack>
          </Stack>

          <ReaderHealthReportList viewMode={viewMode} />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default ReaderHealthReport;


