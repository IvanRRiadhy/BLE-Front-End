import { useEffect, useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import AddEditDeviceSidebar from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/AddEditDeviceSidebar';
import EditDeviceFloorView from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/Preview/EditDeviceFloorView';
import DeviceDetailSidebar from 'src/components/master/CRUD/floorplanDevice/AddEditFloorplanDevice/DeviceDetailSidebar';
import { RootState, useSelector } from 'src/store/Store';

const FloorplanDeviceEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const drawingPath = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.drawingDevicePath,
  );
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  useEffect(() => {
    if (selectedFloorplan) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [selectedFloorplan]);
  if (!selectedFloorplan && !loading) {
    window.location.href = '/master/device';
  }

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
      {/* <Breadcrumb title="Floorplan Device Edit" subtitle="See the floorplan device" /> */}
      <AppCard>
        <Box
          display="flex"
          flexDirection="column"
          height={'90vh'}
          // maxHeight={855}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <AddEditDeviceSidebar
            // isMobileSidebarOpen={isMobileSidebarOpen}
            // onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          {editingDevice && !drawingPath && (
            <Box
              position="absolute"
              // top={140}
              left={285}
              height="90vh"
              maxHeight={855}
              zIndex={1}
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
        </Box>

        <Box flexGrow={1}>
          <EditDeviceFloorView zoomable />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default FloorplanDeviceEdit;
