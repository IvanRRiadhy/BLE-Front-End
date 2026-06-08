import { useEffect, useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import { RootState, useSelector } from 'src/store/Store';
import EditBoundaryFloorView from 'src/components/master/Alarm Setting/Boundary/BoundaryEdit/Preview/EditBoundaryFloorView';
import BoundarySidebar from 'src/components/master/Alarm Setting/Boundary/BoundaryEdit/BoundarySidebar';

const BoundaryEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const selectedBoundary = useSelector(
    (state: RootState) => state.BoundaryReducer.selectedBoundaryAlarm,
  );
//   useEffect(() => {
//     if (selectedBoundary) {
//       setLoading(false);
//     } else {
//       setLoading(true);
//     }
//   }, [selectedBoundary]);
//   if (!selectedBoundary && !loading) {
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
        {/* <Breadcrumb title="Boundary Edit" subtitle="See the stay on area edit" /> */}
        <AppCard>
          <Box
            display="flex"
            flexDirection="column"
            minHeight={'90vh'}
            // maxHeight={855}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <BoundarySidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
  
          <Box flexGrow={1}>
            <EditBoundaryFloorView />
          </Box>
  
        </AppCard>
      </PageContainer>
    );
};

export default BoundaryEdit;
