import { useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import AddEditMaskedAreaSidebar from 'src/components/master/CRUD/maskedArea/AddEditMaskedArea/AddEditMaskAreaSidebar';
// import EditDeviceFloorView from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/Preview/EditDeviceFloorView';
// import DeviceDetailSidebar from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/DeviceDetailSidebar';
import { RootState, useSelector } from 'src/store/Store';
import EditAreaFloorView from 'src/components/master/CRUD/maskedArea/AddEditMaskedArea/Preview/EditAreaFloorView';
import AreaDetailSidebar from 'src/components/master/CRUD/maskedArea/AddEditMaskedArea/AreaDetailSidebar';
import FloorplanOverviewSidebar from 'src/components/master/CRUD/floorplan/FloorplanOverview/FloorplanOverviewSidebar/FloorplanOverviewSidebar';

const MaskedAreaEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const editingArea = useSelector((state: RootState) => state.maskedAreaReducer.editingMaskedArea);
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  if (!selectedFloorplan) {
    window.location.href = '/master/floorplanmaskedarea/';
  }
  return (
    <PageContainer title="Masked Area" description="this is masked area page">
      <AppCard>
        <Box
          display="flex"
          flexDirection="column"
          height={'90vh'}
          // maxHeight={855}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <AddEditMaskedAreaSidebar
            // isMobileSidebarOpen={isMobileSidebarOpen}
            // onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          {/* <FloorplanOverviewSidebar /> */}
                  {editingArea && (
          <Box
            position="absolute"
            // top={140}
            left={285}
            height='90vh'
            maxHeight={855}
            zIndex={1}
            sx={{
              boxShadow: '-2px 0px 8px rgba(0,0,0,0.15)', // Add shadow for visual separation
            }}
          >
            <AreaDetailSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
            
          </Box>
        )}
        </Box>

        <Box flexGrow={1}>
          <EditAreaFloorView zoomable />
        </Box>

      </AppCard>
    </PageContainer>
  );
};

export default MaskedAreaEdit;
