import { useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import AddEditDeviceSidebar from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/AddEditDeviceSidebar';
import EditDeviceFloorView from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/Preview/EditDeviceFloorView';
import DeviceDetailSidebar from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/DeviceDetailSidebar';
import { RootState, useSelector } from 'src/store/Store';

const FloorplanDeviceEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );

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
          <AddEditDeviceSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </Box>

        <Box flexGrow={1}>
          <EditDeviceFloorView zoomable />
        </Box>
        {editingDevice && (
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
            <DeviceDetailSidebar
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
