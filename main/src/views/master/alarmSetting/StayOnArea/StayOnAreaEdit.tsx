import { useEffect, useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import { RootState, useSelector } from 'src/store/Store';
import EditStayOnAreaFloorView from 'src/components/master/Alarm Setting/StayOnArea/StayOnAreaEdit/Preview/EditStayOnAreaFloorView';
import StayOnAreaSidebar from 'src/components/master/Alarm Setting/StayOnArea/StayOnAreaEdit/StayOnAreaSidebar';

const StayOnAreaEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const selectedStayOnArea = useSelector(
    (state: RootState) => state.StayOnAreaReducer.selectedStayOnAreaAlarm,
  );
//   useEffect(() => {
//     if (selectedStayOnArea) {
//       setLoading(false);
//     } else {
//       setLoading(true);
//     }
//   }, [selectedStayOnArea]);
//   if (!selectedStayOnArea && !loading) {
//     window.location.href = '/master/alarmsetting/geofencing';
//   }
  if (loading) {
    return (
      <PageContainer title="People Tracking System" description="People Tracking System">
        <AppCard>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="90vh">
            Loading...
          </Box>
        </AppCard>
      </PageContainer>
    );
  }

    return (
      <PageContainer title="People Tracking System" description="People Tracking System">
        {/* <Breadcrumb title="Stay On Area Edit" subtitle="See the stay on area edit" /> */}
        <AppCard>
          <Box
            display="flex"
            flexDirection="column"
            minHeight={'90vh'}
            // maxHeight={855}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <StayOnAreaSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
  
          <Box flexGrow={1}>
            <EditStayOnAreaFloorView />
          </Box>
  
        </AppCard>
      </PageContainer>
    );
};

export default StayOnAreaEdit;
