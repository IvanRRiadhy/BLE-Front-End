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

const FloorplanDeviceEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const editingArea = useSelector((state: RootState) => state.maskedAreaReducer.editingMaskedArea);
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  if (!selectedFloorplan) {
    window.location.href = '/master/floorplanmaskedarea/';
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
          <AddEditMaskedAreaSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </Box>

        <Box flexGrow={1}>
          <EditAreaFloorView zoomable />
        </Box>
        {editingArea && (
          <Box
            position="absolute"
            top={140}
            left={285}
            minHeight={'70vh'}
            maxHeight={710}
            zIndex={1000}
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
      </AppCard>
    </PageContainer>
  );
};

export default FloorplanDeviceEdit;
