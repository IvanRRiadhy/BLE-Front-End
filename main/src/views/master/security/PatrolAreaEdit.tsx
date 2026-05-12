import { useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import AddEditPatrolAreaSidebar from 'src/components/master/Security/PatrolArea/AddEditPatrolArea/AddEditPatrolAreaSidebar';
// import EditDeviceFloorView from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/Preview/EditDeviceFloorView';
// import DeviceDetailSidebar from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/DeviceDetailSidebar';
import { RootState, useSelector } from 'src/store/Store';
import EditPatrolAreaFloorView from 'src/components/master/Security/PatrolArea/AddEditPatrolArea/Preview/EditPatrolAreaFloorView';
import PatrolAreaDetailSidebar from 'src/components/master/Security/PatrolArea/AddEditPatrolArea/PatrolAreaDetailSidebar';

const PatrolAreaEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const editingArea = useSelector((state: RootState) => state.PatrolAreaReducer.editingPatrolArea);
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  if (!selectedFloorplan) {
    window.location.href = '/master/patrolarea/';
  }
  return (
    <PageContainer title="People Tracking System" description="People Tracking System">
      <AppCard>
        <Box
          display="flex"
          flexDirection="column"
          height={'90vh'}
          maxHeight={855}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <AddEditPatrolAreaSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
                  {editingArea && (
          <Box
            position="absolute"
            // top={140}
            left={285}
            height='90vh'
            maxHeight={"100%"}
            zIndex={1}
            sx={{
              boxShadow: '-2px 0px 8px rgba(0,0,0,0.15)', // Add shadow for visual separation
            }}
          >
            <PatrolAreaDetailSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
        )}
        </Box>

        <Box flexGrow={1}>
          <EditPatrolAreaFloorView zoomable />
        </Box>

      </AppCard>
    </PageContainer>
  );
};

export default PatrolAreaEdit;
