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
  if (loading) {
    return (
      <PageContainer title="GeoFence" description="this is GeoFence Edit page">
        <AppCard>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            Loading...
          </Box>
        </AppCard>
      </PageContainer>
    );
  }

    return (
      <PageContainer title="GeoFence" description="this is GeoFence Edit page">
        {/* <Breadcrumb title="GeoFence Edit" subtitle="See the GeoFence Edit" /> */}
        <AppCard>
          <Box
            display="flex"
            flexDirection="column"
            minHeight={'90vh'}
            // maxHeight={855}
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
