import { useState } from 'react';
import {
  Drawer,
  useMediaQuery,
  Theme,
  Grid2 as Grid,
  Box,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

import AppCard from 'src/components/shared/AppCard';

import ParentCard from 'src/components/shared/ParentCard';
import { useTranslation } from 'react-i18next';
import AlarmTriggerList from 'src/components/master/Reports/alarmTrigger/AlarmTriggerList';
import {  useAlarmTriggerStatus } from 'src/hooks/useAlarmTrigger';

interface cardType {
  icon?: string;
  title: string;
  subtitle: string;
  bgcolor: string;
}

const drawerWidth = 320;

const AlarmTrigger = () => {
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  // const alarmTriggerCount = useSelector(
  //   (state: RootState) => state.alarmTriggerReducer.alarmTriggerTotalCount,
  // );
  // const hasLoaded = useSelector((state: RootState) => state.alarmTriggerReducer.hasLoaded);
  const {filteredCount: alarmTriggerCount, hasLoaded} = useAlarmTriggerStatus();
  const { t } = useTranslation();

  const topCards: cardType[] = [
    {
      title: 'Total Alarm Triggers',
      subtitle: alarmTriggerCount.toString(),
      bgcolor: 'success',
    },
  ];
  return (
    <PageContainer title="Alarm Trigger" description="This is the Alarm Trigger CRUD Page">
      {/* <Breadcrumb title="Alarm Trigger Table" /> */}
      <Grid container spacing={3} mb={3}>
        {topCards.map((topcard, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4, lg: 2 }}>
            <Box bgcolor={topcard.bgcolor + '.light'} textAlign="center">
              <CardContent>
                <Typography
                  color={topcard.bgcolor + '.dark'}
                  mt={1}
                  variant="subtitle1"
                  fontWeight={600}
                  fontSize={13}
                >
                  {t(`${topcard.title}`)}
                </Typography>
                {!hasLoaded ? (
                  <CircularProgress
                    size={24}
                    style={{ marginTop: 10, color: topcard.bgcolor + '.main' }}
                  />
                ) : (
                  <Typography
                    color={topcard.bgcolor + '.main'}
                    variant="h4"
                    fontWeight={600}
                    fontSize={25}
                  >
                    {topcard.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Box>
          </Grid>
        ))}
      </Grid>
      <AppCard>
        <Drawer
          anchor="right"
          open={isRightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          variant={mdUp ? 'permanent' : 'temporary'}
          sx={{
            width: mdUp ? drawerWidth : '100%',
            zIndex: lgUp ? 0 : 1,
            flex: mdUp ? 'auto' : '',
            [`& .MuiDrawer-paper`]: { width: '100%', position: 'relative' },
          }}
        >
          <ParentCard
            title="Alarm Trigger List"
            // codeModel={}
          >
            <AlarmTriggerList />
          </ParentCard>
        </Drawer>
      </AppCard>
    </PageContainer>
  );
};

export default AlarmTrigger;