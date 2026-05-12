import { Box, Grid2 as Grid, Stack } from '@mui/material';
import {
  IconBuildingBroadcastTower,
  IconCircleX,
  IconClock,
  IconActivityHeartbeat,
  IconMapPin,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import PageContainer from 'src/components/container/PageContainer';
import AreaDistribution from 'src/components/dashboards/newmainmenu/AreaDistribution';
import TopButton from 'src/components/dashboards/newmainmenu/TopButton';
import UpcomingVisitor from 'src/components/dashboards/newmainmenu/UpcomingVisitor';
import { useAlarmByArea, useAlarmByStatus, useTopButtonSummary } from 'src/hooks/useDashboard';
import { CountCardType, fetchDashboardTopCards } from 'src/store/apps/dashboard/Dashboard';
import { setMainMenu } from 'src/store/customizer/CustomizerSlice';
import { RootState, useDispatch } from 'src/store/Store';
import AlarmLog from 'src/components/dashboards/newmainmenu/AlarmLog';
import NewBlacklist from 'src/components/dashboards/newmainmenu/BlacklistList';
import BeaconDistribution from 'src/components/dashboards/newmainmenu/BeaconDistribution';
import Tracking from 'src/components/dashboards/newmainmenu/TrackingChart';
import Statistic from 'src/components/dashboards/newmainmenu/Statistic';
import Bar from 'src/components/dashboards/newmainmenu/Bar';
import AlarmCategorized from 'src/components/dashboards/newmainmenu/AlarmCategorized';
import WelcomePopup from 'src/components/dashboards/mainmenu/WelcomePopup';
import AlarmRadarChart from 'src/components/dashboards/newmainmenu/AlarmDurationChart';
import PeakHour from 'src/components/dashboards/newmainmenu/PeakHour';
import AlarmInvestigatedResult from 'src/components/dashboards/newmainmenu/AlarmInvestigatedResult';
const filter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: '',
  SortDir: 'desc',
  SearchValue: '',
};

const DashboardView: React.FC = () => {
  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if the welcome popup has already been shown
    const popupShown = localStorage.getItem('welcomePopupShown');
    if (!popupShown || popupShown !== 'true') {
      setShowWelcomePopup(true); // Show the popup
      localStorage.setItem('welcomePopupShown', 'true'); // Set the flag in localStorage
    }
    dispatch(setMainMenu(true));
  }, []);

  useEffect(() => {
    // This runs on every route change
    return () => {
      // This cleanup runs when leaving the page
      dispatch(setMainMenu(false));
      console.log('Navigated away from dashboard');
    };
  }, [location.pathname]);

  const handleClosePopup = () => {
    setShowWelcomePopup(false); // Close the popup
  };

  // useEffect(() => {
  //   dispatch(fetchDashboardTopCards());
  // }, [dispatch, dashboardFilter]);
  const { data: topSummary, isLoading: isTopSummaryLoading } = useTopButtonSummary({
    buildingId: dashboardFilter?.BuildingId ?? [],
    floorId: dashboardFilter?.FloorId ?? [],
    floorplanId: dashboardFilter?.FloorplanId ?? [],
    areaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
    TimeRange: 'daily',
  });

  const blacklistFilteredCount = topSummary?.blacklistedCount ?? 0;
  const maskedAreaFilteredCount = topSummary?.areaCount ?? 0;
  const bleReaderFilteredCount = topSummary?.activeGatewayCount ?? 0;
  const alarmFilteredCount = topSummary?.alarmCount ?? 0;
  const activeTag = topSummary?.activeBeaconCount ?? 0;
  const nonActiveTag = topSummary?.nonActiveBeaconCount ?? 0;
  const { data: alarmByStatus = [], isLoading: isAlarmByStatusLoading } = useAlarmByStatus({
    TimeRange: 'daily',
    buildingId: dashboardFilter?.BuildingId ?? [],
    floorId: dashboardFilter?.FloorId ?? [],
    floorplanId: dashboardFilter?.FloorplanId ?? [],
    areaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
  });
  const { data: alarmByArea = [], isLoading: isAlarmByAreaLoading } = useAlarmByArea({
    TimeRange: 'daily',

    buildingId: dashboardFilter?.BuildingId ?? [],
    floorId: dashboardFilter?.FloorId ?? [],
    floorplanId: dashboardFilter?.FloorplanId ?? [],
    areaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
  });

  const topAlarmAreas = useMemo(() => {
    if (!alarmByArea?.areas?.length) return [];

    return alarmByArea.areas
      .map((area: any) => {
        const total = area.series.reduce((sum: number, s: any) => sum + (s.data?.[0] ?? 0), 0);
        // console.log("alarm by area", area, "total", total);
        return {
          areaName: area.name, // reuse existing prop name
          total,
        };
      })
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 3);
  }, [alarmByArea]);
  // console.log("alarrm by status", alarmByStatus, "alarm by area", topAlarmAreas);
  return (
    <PageContainer title="People Tracking System" description="This is Dashboard page">
      <Box id="dashboard">
        <Grid container spacing={1}>
          {/* First Row */}
          {/* <Grid container size={12} spacing={1} mt={0}>
            <Grid size={2.5}>
              <Stack spacing={1}>
                <AlarmCategorized title="Alarm By Status" data={alarmByStatus} />
                <AlarmCategorized title="Alarm By Area" data={topAlarmAreas} />
              </Stack>
            </Grid>

            <Grid size={4.75}>
              <Bar />
            </Grid>

            <Grid size={4.75}>
              <Statistic />
            </Grid>
          </Grid> */}
          <Grid container size={12} spacing={1}>
            <Grid size={2.5}>
              <AlarmRadarChart />
            </Grid>
            <Grid size={2.3}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 0.5,
                  p: 1,
                  pt: 1.5,
                }}
              >
                <TopButton
                  icon={IconClock}
                  label="Alarm"
                  num={alarmFilteredCount}
                  color="#045498"
                />
                {/* <TopButton
                  icon={IconClock}
                  label="Active Alarm"
                  num={alarmFilteredCount}
                  color="#D73D3D"
                /> */}
                <TopButton
                  icon={IconCircleX}
                  label="Blacklist"
                  num={blacklistFilteredCount}
                  color="#D73D3D"
                />
                <TopButton
                  icon={IconActivityHeartbeat}
                  label="Active Card"
                  num={activeTag}
                  color="#045498"
                />

                <TopButton
                  icon={IconBuildingBroadcastTower}
                  label="Gateway"
                  num={bleReaderFilteredCount}
                  color="#045498"
                />
                <TopButton
                  icon={IconActivityHeartbeat}
                  label="NonActive Card"
                  num={nonActiveTag}
                  color="#045498"
                />
                <TopButton
                  icon={IconMapPin}
                  label="Area"
                  num={maskedAreaFilteredCount}
                  color="#045498"
                />
                {/* <TopButton icon={IconMapPin} label="Placeholder" num={123} color="#045498" /> */}
              </Box>
            </Grid>

            <Grid size={2.45}>
              <UpcomingVisitor />
            </Grid>

            <Grid size={3}>
              <AlarmLog />
            </Grid>

            <Grid size={1.75}>
              <NewBlacklist />
            </Grid>
          </Grid>

          {/* Second Row */}
          {/* Left Side Second Row */}
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <AreaDistribution />
          </Grid>

          {/* Right Side Second Row */}
          <Grid size={{ xs: 12, sm: 6, md: 9.5 }}>
            <Grid container spacing={1}>
              {/* Top Section */}
              <Grid container size={12} spacing={1}>
                <Grid size={6}>
                  <BeaconDistribution />
                </Grid>

                <Grid size={6}>
                  <Tracking />
                </Grid>
              </Grid>

              {/* BOTTOM SECTION */}
              <Grid container size={12} spacing={1}>
                <Grid size={6}>
                  <PeakHour />
                </Grid>

                <Grid size={6}>
                  <Statistic />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* SECOND ROW */}

          {/* THIRD ROW */}
          <Grid container size={12} spacing={1} mt={0}>
            <Grid size={2.5}>
              <Stack spacing={1}>
                <AlarmCategorized title="Alarm By Status" data={alarmByStatus} />
                <AlarmCategorized title="Alarm By Area" data={topAlarmAreas} />
              </Stack>
            </Grid>

            <Grid size={4.75}>
              <Bar />
            </Grid>

            <Grid size={4.75}>
              <AlarmInvestigatedResult />
            </Grid>
          </Grid>
        </Grid>
      </Box>
      {/* Welcome Popup */} 
      <WelcomePopup open={showWelcomePopup} onClose={handleClosePopup} />
    </PageContainer>
  );
};

export default DashboardView;
