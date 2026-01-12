// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import { Box, Grid2 as Grid, Stack } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import TopCards from 'src/components/dashboards/mainmenu/TopCards';
import TrackingGraph from 'src/components/dashboards/mainmenu/Tracking';
import AlarmWarning from 'src/components/dashboards/mainmenu/AlarmWarning';
import BlacklistTable from 'src/components/dashboards/mainmenu/Blacklist';
import WelcomePopup from 'src/components/dashboards/mainmenu/WelcomePopup';
import { blacklistType, fetchBlacklistDT } from 'src/store/apps/crud/blacklist';
import { fetchMaskedAreaDT, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { fetchBleReaderDT } from 'src/store/apps/crud/bleReader';
import { AlarmType } from 'src/store/apps/crud/alarmRecordTracking';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { setMainMenu } from 'src/store/customizer/CustomizerSlice';
import { fetchFloorplanDeviceDT, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import BlacklistList from 'src/components/master/CRUD/blacklist/BlacklistList';
import HeatmapFloorplan from 'src/components/dashboards/mainmenu/Heatmap';
import { fetchFloorDT, floorType } from 'src/store/apps/crud/floor';
import BeaconDistribution from 'src/components/dashboards/mainmenu/BeaconDistribution';
import AreaDistribution from 'src/components/dashboards/mainmenu/AreaDistribution';
import { CardType, fetchCardDT } from 'src/store/apps/crud/card';
import DynamicSwitcherCard from 'src/components/dashboards/mainmenu/DynamicCardSwitcher';
import ChartSwitcher from 'src/components/dashboards/mainmenu/ChartSwitcher';
import {
  CountCardType,
  DashboardAreaAccessType,
  DashboardAreaChartType,
  fetchAreaChart,
  fetchCardCount,
  fetchDashboardTopCards,
} from 'src/store/apps/dashboard/Dashboard';
import NewAreaDistribution from 'src/components/dashboards/newmainmenu/AreaDistribution';
import AlarmLog from 'src/components/dashboards/newmainmenu/AlarmLog';
import UpcomingVisitor from 'src/components/dashboards/newmainmenu/UpcomingVisitor';
import NewBlacklist from 'src/components/dashboards/newmainmenu/BlacklistList';
import NewBeaconDistribution from 'src/components/dashboards/newmainmenu/BeaconDistribution';
import Tracking from 'src/components/dashboards/newmainmenu/TrackingChart';
import { useAlarmByArea, useAlarmByStatus } from 'src/hooks/useDashboard';
import AlarmCategorized from 'src/components/dashboards/newmainmenu/AlarmCategorized';

const filter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: '',
  SortDir: 'desc',
  SearchValue: '',
};

const Modern = () => {
  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);
  // const [filters, setFilters] = useState({
  //   ...filter,
  //   filter: dashboardFilter,
  // });
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
  // useEffect(() => {
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     dispatch(setMainMenu(false));
  //     console.log('Before Unload');
  //     e.preventDefault();
  //     // e.returnValue = ''; // Triggers browser's native dialog
  //   };
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  // }, []);
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
  //   setFilters({
  //     ...filters,
  //     filter: dashboardFilter,
  //   });
  // }, [dashboardFilter]);

  useEffect(() => {
    //Test new API
    dispatch(fetchDashboardTopCards());
    dispatch(fetchCardCount());
    dispatch(
      fetchAreaChart({
        TimeRange: 'today',
        from: null,
        to: null,
        operatorName: null,
        visitorId: null,
        buildingId: null,
        floorId: null,
        floorplanMaskedAreaId: null,
      }),
    );

    // Fetch initial data for the dashboard
    // dispatch(
    //   // fetchTrackingTransDT({
    //   //   ...filter,
    //   //   length: 0,
    //   //   filters: {
    //   //     FloorplanMaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId || [],
    //   //     ReaderId: [],
    //   //   },
    //   // }),
    //   fetchTrackingTrans(),
    // );
    // dispatch(fetchAlarm());
    dispatch(
      fetchCardDT({
        ...filter,
        Length: 0,
        filters: {
          IsUsed: true,
        },
      }),
    );
    dispatch(
      fetchCardDT({
        ...filter,
        filters: {
          IsUsed: false,
        },
      }),
    );
    dispatch(
      fetchBlacklistDT({
        ...filter,
        filters: {
          FloorplanMaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId || [],
        },
      }),
    );
    dispatch(
      fetchFloorDT({
        ...filter,
        filters: {
          BuildingId: dashboardFilter?.BuildingId || [],
        },
      }),
    );
    dispatch(
      fetchMaskedAreaDT({
        ...filter,
        filters: {
          FloorId: dashboardFilter?.FloorId || [],
          FloorplanId: dashboardFilter?.FloorplanId || [],
        },
      }),
    );
    dispatch(
      fetchFloorplanDeviceDT({
        ...filter,
        filters: {
          FloorplanId: dashboardFilter?.FloorplanId || [],
          Type: 2,
        },
      }),
    );
    // dispatch(
    //   fetchAlarmDT({
    //     ...filter,
    //     SortColumn: 'Timestamp',
    //     Length: alarmRowsPerPage,
    //     Start: alarmPage * alarmRowsPerPage,
    //     filters: {
    //       FloorplanMaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId || [],
    //     },
    //   }),
    // );
  }, [dispatch, dashboardFilter]);
  const trackingFilteredCount: number = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransFilteredCount ?? 0,
  );
  // const blacklistFilteredCount: number = useSelector(
  //   (state: RootState) => state.blacklistReducer.blacklistFilteredCount ?? 0,
  // );
  const blacklistFilteredCount: number = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.data?.blacklistCount ?? 0,
  );
  const blacklistData: blacklistType[] = useSelector(
    (state: RootState) => state.blacklistReducer.blacklists,
  );
  const floorData: floorType[] = useSelector((state: RootState) => state.floorReducer.floors);
  // const maskedAreaFilteredCount: number = useSelector(
  //   (state: RootState) => state.maskedAreaReducer.maskedAreaFilteredCount ?? 0,
  // );
  const maskedAreaFilteredCount: number = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.data?.areaCount ?? 0,
  );
  const maskedAreaData: MaskedAreaType[] = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreas,
  );
  // const bleReaderFilteredCount: number = useSelector(
  //   (state: RootState) => state.floorplanDeviceReducer.floorplanDeviceFilteredCount ?? 0,
  // );
  const bleReaderFilteredCount: number = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.data?.activeGatewayCount ?? 0,
  );
  const bleReaderData: FloorplanDeviceType[] = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.floorplanDevices,
  );
  // const alarmFilteredCount: number = useSelector(
  //   (state: RootState) => state.alarmReducer.alarmRecordFilteredCount ?? 0,
  // );
  const alarmFilteredCount: number = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.data?.alarmCount ?? 0,
  );
  const alarmFilteredData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  const trackingData: trackingTransType[] = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransAll,
  );
  const alarmAllData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackingAll,
  );
  const alarmData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  // const activeTag: number = useSelector(
  //   (state: RootState) => state.CardReducer.cardActiveCount ?? 0,
  // );
  // const nonActiveTag: number = useSelector(
  //   (state: RootState) => state.CardReducer.cardNonActiveCount ?? 0,
  // );
  const activeTag: number = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.data?.activeBeaconCount ?? 0,
  );
  const nonActiveTag: number = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.data?.nonActiveBeaconCount ?? 0,
  );
  const activeTagData: CardType[] = useSelector(
    (state: RootState) => state.CardReducer.cardActiveData,
  );
  const nonActiveTagData: CardType[] = useSelector(
    (state: RootState) => state.CardReducer.cardNonActiveData,
  );
  const topCardsLoaded: boolean = useSelector(
    (state: RootState) => state.DashboardReducer.topCards.hasLoaded,
  );
  const cardCountData: CountCardType | null = useSelector(
    (state: RootState) => state.DashboardReducer.CardCount.data,
  );
  const cardCountLoaded: boolean = useSelector(
    (state: RootState) => state.DashboardReducer.CardCount.hasLoaded,
  );
  const areaChartData: DashboardAreaChartType[] | null = useSelector(
    (state: RootState) => state.DashboardReducer.areaChart.data,
  );
  const areaChartLoaded: boolean = useSelector(
    (state: RootState) => state.DashboardReducer.areaChart.hasLoaded,
  );
  const trackingGraphData: DashboardAreaAccessType | null = useSelector(
    (state: RootState) => state.DashboardReducer.trackingGraph.data,
  );
  const trackingGraphLoaded: boolean = useSelector(
    (state: RootState) => state.DashboardReducer.trackingGraph.hasLoaded,
  );
  useEffect(() => {
    console.log('Area Chart Data', areaChartData, areaChartLoaded);
  }, [areaChartData, areaChartLoaded]);

  const { data: alarmByStatus = [], isLoading: isAlarmByStatusLoading } = useAlarmByStatus({
    timeRange: 'daily',
  });
  const { data: alarmByArea = [], isLoading: isAlarmByAreaLoading } = useAlarmByArea({
    timeRange: 'daily',
  });
  return (
    <PageContainer title="Dashboard" description="this is Dashboard page">
      <Box>
        <Grid container spacing={3} mb={3}>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 12,
            }}
          >
            <TopCards
              ActiveBeaconCount={activeTag}
              ActiveGatewayCount={bleReaderFilteredCount}
              AreaCount={maskedAreaFilteredCount}
              BlacklistCount={blacklistFilteredCount}
              AlarmCount={alarmFilteredCount}
              NonActiveBeaconCount={nonActiveTag}
              FirstActiveBeacon={activeTagData?.flat().map((item) => item.name)}
              FirstActiveGateway={bleReaderData?.flat().map((item) => item.name)}
              FirstArea={maskedAreaData?.flat().map((item) => item.name)}
              FirstBlacklist={blacklistData
                ?.flat()
                .map((item) => item.visitor?.name ?? 'Unknown Visitor')}
              FirstAlarm={alarmFilteredData
                ?.flat()
                .map((item) => item.visitor?.name ?? 'Unknown Visitor')}
              FirstNonActiveBeacon={nonActiveTagData?.flat().map((item) => item.name)}
              hasLoaded={topCardsLoaded}
            />
          </Grid>
          {/* column */}
          <Grid container spacing={3} alignItems={'stretch'}>
            {/* Tracking Graphic */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <TrackingGraph alarmData={alarmAllData} trackingData={trackingData} />
            </Grid>

            <Grid size={{ xs: 12, lg: 3 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <DynamicSwitcherCard
                defaultType="Alarm"
                availableTypes={['Alarm', 'Blacklist']}
                componentProps={{
                  Alarm: {},
                  Blacklist: {
                    filterFloorplanId: dashboardFilter?.FloorplanId ?? [],
                  },
                  Tracking: {},
                  Visitor: {},
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 3 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <ChartSwitcher
                availableCharts={['Beacon', 'Area', 'Tracking', 'Visitor']}
                chartProps={{
                  // ✅ Beacon chart waits for cardCountLoaded
                  Beacon:
                    cardCountLoaded && cardCountData
                      ? {
                          outerRadius: 100,
                          innerRadius: 80,
                          data: [
                            {
                              name: 'Employee',
                              value: cardCountData.memberCardCount ?? 0,
                              color: '#43a047',
                            },
                            {
                              name: 'Visitor',
                              value: cardCountData.visitorCardCount ?? 0,
                              color: '#0f39c5ff',
                            },
                            {
                              name: 'Unassigned',
                              value:
                                (cardCountData.totalCardCount ?? 0) -
                                ((cardCountData.visitorCardCount ?? 0) +
                                  (cardCountData.memberCardCount ?? 0)),
                              color: '#9e9e9e',
                            },
                          ],
                        }
                      : {
                          // 🕓 Placeholder (shows while loading)
                          outerRadius: 100,
                          innerRadius: 80,
                          data: [{ name: 'Loading...', value: 1, color: '#ccc' }],
                        },

                  // ✅ Area still always displays its dummy data
                  Area: {
                    outerRadius: 90,
                    label: 'Area Usage',
                    data: areaChartData,
                  },
                }}
              />
            </Grid>

            {/* <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <HeatmapFloorplan
                TrackingList={trackingData}
                Floorlist={floorData}
                maskedAreaList={maskedAreaData}
                floorImageUrl={'/Uploads/FloorImages/0d2f3336-7689-4f38-9c0e-79cbab4d2e66.png'}
                imageWidth={800}
                imageHeight={200}
              />
            </Grid> */}

            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <NewAreaDistribution />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <AlarmLog />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <UpcomingVisitor />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <NewBlacklist />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <NewBeaconDistribution />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Tracking />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Grid size={4}>
                <Stack spacing={1}>
                  <AlarmCategorized title="Alarm By Status" data={alarmByStatus} />
                  <AlarmCategorized title="Alarm By Area" data={alarmByArea} />
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
      {/* Welcome Popup */}
      <WelcomePopup open={showWelcomePopup} onClose={handleClosePopup} />
    </PageContainer>
  );
};

export default Modern;
