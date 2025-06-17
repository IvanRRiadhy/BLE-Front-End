import { useState } from 'react';
import {
  Drawer,
  useMediaQuery,
  Theme,
  Grid2 as Grid,
  Box,
  CardContent,
  Typography,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import { RootState, useSelector } from 'src/store/Store';
import ParentCard from 'src/components/shared/ParentCard';
import { useTranslation } from 'react-i18next';
import AlarmRecordList from 'src/components/master/CRUD/alarmRecord/AlarmRecordList';
import AddEditAlarmRecord from 'src/components/master/CRUD/alarmRecord/AddEditAlarmRecord';

interface cardType {
  icon?: string;
  title: string;
  subtitle: string;
  bgcolor: string;
}

const drawerWidth = 320;

const AlarmRecord = () => {
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const alarmRecordList = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  const { t } = useTranslation();

  const topCards: cardType[] = [
    {
      title: 'Total Alarm Records',
      subtitle: alarmRecordList.length.toString(),
      bgcolor: 'success',
    },
  ];
  return (
    <PageContainer title="Alarm Record" description="This is the Alarm Record CRUD Page">
      <Breadcrumb title="Alarm Record Table" />
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
                <Typography
                  color={topcard.bgcolor + '.main'}
                  variant="h4"
                  fontWeight={600}
                  fontSize={25}
                >
                  {topcard.subtitle}
                </Typography>
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
          <ParentCard title="Alarm Record List">
            <AlarmRecordList />
          </ParentCard>
        </Drawer>
      </AppCard>
    </PageContainer>
  );
};

export default AlarmRecord;
