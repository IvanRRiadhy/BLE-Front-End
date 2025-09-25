import { useEffect, useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import { RootState, useSelector } from 'src/store/Store';
import EditGeoFenceFloorView from 'src/components/master/Alarm Setting/Geofencing/GeoFencingEdit/Preview/EditGeoFenceFloorView';
import GeoFencingSidebar from 'src/components/master/Alarm Setting/Geofencing/GeoFencingEdit/GeoFencingSidebar';

const GeoFencingEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const selectedGeoFence = useSelector(
    (state: RootState) => state.GeoFencingReducer.selectedGeoFencingAlarm,
  );
//   useEffect(() => {
//     if (selectedGeoFence) {
//       setLoading(false);
//     } else {
//       setLoading(true);
//     }
//   }, [selectedGeoFence]);
//   if (!selectedGeoFence && !loading) {
//     window.location.href = '/master/alarmsetting/geofencing';
//   }
  if (loading) {
    return (
      <PageContainer title="Floorplan Device" description="this is floorplan device page">
        <AppCard>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            Loading...
          </Box>
        </AppCard>
      </PageContainer>
    );
  }

    return (
      <PageContainer title="Floorplan Device" description="this is floorplan device page">
        {/* <Breadcrumb title="Floorplan Device Edit" subtitle="See the floorplan device" /> */}
        <AppCard>
          <Box
            display="flex"
            flexDirection="column"
            minHeight={'80vh'}
            maxHeight={715}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <GeoFencingSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
  
          <Box flexGrow={1}>
            <EditGeoFenceFloorView />
          </Box>
  
        </AppCard>
      </PageContainer>
    );
};

export default GeoFencingEdit;
