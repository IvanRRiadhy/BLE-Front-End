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
import { RootState, useSelector } from 'src/store/Store';
import ParentCard from 'src/components/shared/ParentCard';
import { useTranslation } from 'react-i18next';
import FloorplanList from 'src/components/master/CRUD/floorplan/FloorplanList';
import AddEditFloorplan from 'src/components/master/CRUD/floorplan/AddEditFloorplan';
import FloorplanFilter from 'src/components/master/CRUD/floorplan/FloorplanFilter';
import FloorplanImport from 'src/components/master/CRUD/floorplan/FloorplanImport';
import FloorplanExport from 'src/components/master/CRUD/floorplan/FloorplanExport';
import { useFloorplanStatus } from 'src/hooks/useFloorplan';
import FloorplanSearch from 'src/components/master/CRUD/floorplan/FloorplanSearch';


interface cardType {
  icon?: string;
  title: string;
  subtitle: string;
  bgcolor: string;
}

const drawerWidth = 320;

const Floorplan = () => {
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

const { filteredCount: floorplanCount, hasLoaded, isFetching } = useFloorplanStatus();

  const { t } = useTranslation();
  const topCards: cardType[] = [
    {
      title: 'Total Floorplan',
      subtitle: floorplanCount.toString(),
      bgcolor: 'success',
    },
  ];
  return (
    <PageContainer title="People Tracking System" description="People Tracking System">
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
          <ParentCard title="Floorplan List" codeModel={[
            <FloorplanSearch key="search" />,
            <FloorplanImport key="import" />,
            <FloorplanExport key="export" />,
            <FloorplanFilter key="filter" />,
            <AddEditFloorplan key="add" type="add" />
            ]}>
            <FloorplanList />
          </ParentCard>
          {/* <Box display="flex" flexDirection="row">
            <AddEditDeviceSidebar
              isMobileSidebarOpen={isMobileSidebarOpen}
              onSidebarClose={() => setMobileSidebarOpen(false)}
            />
            <EditDeviceFloorView zoomable />
          </Box> */}
        </Drawer>
      </AppCard>
    </PageContainer>
  );
};

export default Floorplan;
