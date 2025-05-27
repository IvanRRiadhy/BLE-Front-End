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

  return (
    <PageContainer title="Floorplan Device" description="this is floorplan device page">
      {/* <Breadcrumb title="Floorplan Device Edit" subtitle="See the floorplan device" /> */}
      <AppCard>
        <Box
          display="flex"
          flexDirection="column"
          minHeight={800}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <AddEditMaskedAreaSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </Box>
        {/* {editingDevice && (
          <Box display="flex" flexDirection="column" minHeight={800}>
            <DeviceDetailSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
        )}*/}
        {editingArea && (
          <Box display="flex" flexDirection="column" minHeight={800}>
            <AreaDetailSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
        )}
        <Box flexGrow={1}>
          <EditAreaFloorView zoomable />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default FloorplanDeviceEdit;
