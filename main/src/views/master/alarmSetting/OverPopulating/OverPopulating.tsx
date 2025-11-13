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
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import { RootState, useSelector } from 'src/store/Store';
import ParentCard from 'src/components/shared/ParentCard';
import { useTranslation } from 'react-i18next';
import OverPopulatingList from 'src/components/master/Alarm Setting/OverPopulating/overPopulatingList';
import { AddOverPopulating } from 'src/components/master/Alarm Setting/OverPopulating/AddOverpopulating';
import { useOverPopulatingAlarmStats } from 'src/hooks/AlarmSetting/useOverPopulate';
interface cardType {
  icon?: string;
  title: string;
  subtitle: string;
  bgcolor: string;
}

const drawerWidth = 320;

const FloorplanDevice = () => {
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const {activeCount, inactiveCount, hasLoaded} = useOverPopulatingAlarmStats();
  const { t } = useTranslation();
  const topCards: cardType[] = [
    {
      title: 'Total Active OverPopulating Alarm',
      subtitle: activeCount.toString(),
      bgcolor: 'primary',
    },
    {
      title: 'Total Inactive OverPopulating Alarm',
      subtitle: inactiveCount.toString(),
      bgcolor: 'warning',
    }
  ];
  return (
    <PageContainer
      title="OverPopulating Alarm"
      description="This is the OverPopulating Alarm CRUD Page"
    >
      <Breadcrumb title="OverPopulating Alarm Table" />
      <Grid container spacing={3} mb={3}>
        {topCards.map((topcard, i) => {
          return (
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
          );
        })}
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
          <ParentCard title="OverPopulating Alarm List" codeModel={[
            <AddOverPopulating key = "add" />
          ]}>
            <OverPopulatingList />
          </ParentCard>
        </Drawer>
      </AppCard>
    </PageContainer>
  );
};

export default FloorplanDevice;
