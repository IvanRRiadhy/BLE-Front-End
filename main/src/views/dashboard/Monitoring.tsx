import { Box, Grid2 as Grid, Typography, Toolbar, styled } from '@mui/material';
import { AppState, useDispatch, useSelector } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import { useTheme } from '@mui/material';
import MonitoringSidebar from 'src/components/dashboards/monitoring/Sidebar/MonitoringSidebar';
import MonitoringFooter from 'src/components/dashboards/monitoring/Footer/MonitoringFooter';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
import ToolbarMonitor from 'src/layouts/full/monitoringLayout/Toolbar';
import { useEffect } from 'react';
import {
  toggleHorizontal,
  setMonitorSidebar,
  toggleSidebar,
} from 'src/store/customizer/CustomizerSlice';
import MonitoringGrid from 'src/views/dashboard/MonitoringGrid.tsx';

const Monitoring = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const grid = useSelector((state: AppState) => state.layoutReducer.grid); // Get the current grid value
  const floorIds = useSelector((state: AppState) => state.layoutReducer.floorplanId); // Get the current floor IDs

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));
  useEffect(() => {
    // Dispatch actions when the component is mounted
    dispatch(toggleHorizontal(false)); // Enable horizontal layout
    dispatch(setMonitorSidebar(true)); // Enable monitor sidebar
    dispatch(toggleSidebar()); // Disable sidebar

    // Optionally, clean up when the component is unmounted
    return () => {
      dispatch(toggleHorizontal(true)); // Reset horizontal layout
      dispatch(setMonitorSidebar(false)); // Reset monitor sidebar
      dispatch(toggleSidebar()); // Reset sidebar
    };
  }, [dispatch]);
  // Define layouts for each grid type
  // const renderLayout = () => {
  //   switch (grid) {
  //     case 1:
  //       return (
  //         <Grid container>
  //           <Grid
  //             size={{ xs: 12 }}
  //             sx={{
  //               overflow: 'hidden',
  //               border: '2.5px solid black',
  //               transition: 'border-color 0.3s ease, border-width 0.1s ease',
  //               '&:hover': { borderColor: 'success.light', borderWidth: '5px' },
  //             }}
  //           >
  //             <FloorView activeFloor={floorIds[grid][0]} zoomable />
  //           </Grid>
  //         </Grid>
  //       );
  //     case 2:
  //       return (
  //         <Grid container>
  //           <Grid
  //             size={{ xs: 12, lg: 6 }}
  //             sx={{
  //               overflow: 'hidden',
  //               border: '2.5px solid black',
  //               transition: 'border-color 0.3s ease, border-width 0.1s ease',
  //               '&:hover': { borderColor: 'success.dark', borderWidth: '5px' },
  //             }}
  //           >
  //             <FloorView activeFloor={floorIds[grid][0]} zoomable />
  //           </Grid>

  //           <Grid
  //             size={{ xs: 12, lg: 6 }}
  //             sx={{
  //               overflow: 'hidden',
  //               border: '2.5px solid black',
  //               transition: 'border-color 0.3s ease, border-width 0.1s ease',
  //               '&:hover': { borderColor: 'success.dark', borderWidth: '5px' },
  //             }}
  //           >
  //             <FloorView activeFloor={floorIds[grid][1]} zoomable={false} />
  //           </Grid>
  //         </Grid>
  //       );
  //     case 3:
  //       return (
  //         <Grid container>
  //           <Grid size={{ xs: 12, lg: 6 }} sx={{ overflow: 'hidden', border: '2.5px solid black' }}>
  //             <FloorView activeFloor={floorIds[grid][0]} zoomable />
  //           </Grid>
  //           <Grid size={{ xs: 12, lg: 6 }}>
  //             <Grid container direction={'column'}>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][1]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][2]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //         </Grid>
  //       );
  //     case 4:
  //       return (
  //         <Grid container>
  //           <Grid size={{ xs: 12, lg: 6 }}>
  //             <Grid container direction={'column'}>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][0]} zoomable />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][2]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //           <Grid size={{ xs: 12, lg: 6 }}>
  //             <Grid container direction={'column'}>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][1]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][3]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //         </Grid>
  //       );
  //     case 5:
  //       return (
  //         <Grid container>
  //           <Grid size={{ xs: 12, lg: 8 }}>
  //             <Grid container>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '53vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][0]} zoomable />
  //               </Grid>
  //             </Grid>
  //             <Grid container>
  //               <Grid
  //                 size={{ xs: 12, lg: 6 }}
  //                 sx={{ height: '27vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][2]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12, lg: 6 }}
  //                 sx={{ height: '27vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][3]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //           <Grid size={{ xs: 12, lg: 4 }}>
  //             <Grid container>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][1]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '40vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][4]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //         </Grid>
  //       );
  //     case 6:
  //       return (
  //         <Grid container>
  //           <Grid size={{ xs: 12, lg: 8 }}>
  //             <Grid container>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '53vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][0]} zoomable />
  //               </Grid>
  //             </Grid>
  //             <Grid container>
  //               <Grid
  //                 size={{ xs: 12, lg: 6 }}
  //                 sx={{ height: '27vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][3]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12, lg: 6 }}
  //                 sx={{ height: '27vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][4]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //           <Grid size={{ xs: 12, lg: 4 }}>
  //             <Grid container>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '26.5vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][1]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '26.5vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][2]} zoomable={false} />
  //               </Grid>
  //               <Grid
  //                 size={{ xs: 12 }}
  //                 sx={{ height: '27vh', overflow: 'hidden', border: '2.5px solid black' }}
  //               >
  //                 <FloorView activeFloor={floorIds[grid][5]} zoomable={false} />
  //               </Grid>
  //             </Grid>
  //           </Grid>
  //         </Grid>
  //       );
  //     default:
  //       return (
  //         <Grid container>
  //           <Grid size={{ xs: 12 }}>
  //             <Typography variant="h4" fontStyle="bold" fontWeight={900} mt={0.5}>
  //               Monitoring Dashboard
  //             </Typography>
  //             <Typography variant="h6" fontStyle="bold" fontWeight={900} mt={0.5}>
  //               Please select a Grid
  //             </Typography>
  //           </Grid>
  //         </Grid>
  //       );
  //   }
  // };

  return (
    <>
      <ToolbarStyled>
        <ToolbarMonitor />
      </ToolbarStyled>
      <PageContainer
        title="Monitoring Dashboard"
        description="This is the Monitoring Dashboard page"
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <MonitoringSidebar />
          <Box
            mt={0}
            sx={{
              flexGrow: 1,
              margin: 0,
              padding: 0,
              // marginLeft: customizer.isMonitorSidebar
              //   ? customizer.SidebarWidth
              //   : customizer.MiniSidebarWidth,
              transition: theme.transitions.create('margin-left', {
                duration: theme.transitions.duration.shortest,
              }),
            }}
          >
            <MonitoringGrid grid={grid} floorIds={floorIds} />
            {/* {renderLayout()} */}
          </Box>
        </Box>
      </PageContainer>
      <MonitoringFooter />
    </>
  );
};

export default Monitoring;
