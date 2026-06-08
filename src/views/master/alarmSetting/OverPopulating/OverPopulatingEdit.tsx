import { useEffect, useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import { RootState, useSelector } from 'src/store/Store';
import EditOverPopulatingFloorView from 'src/components/master/Alarm Setting/OverPopulating/OverPopulatingEdit/Preview/EditOverPopulatingFloorView';
import OverPopulatingSidebar from 'src/components/master/Alarm Setting/OverPopulating/OverPopulatingEdit/OverPopulatingSidebar';

const OverPopulatingEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const selectedOverPopulating = useSelector(
    (state: RootState) => state.OverPopulatingReducer.selectedOverPopulatingAlarm,
  );
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
        <AppCard>
          <Box
            display="flex"
            flexDirection="column"
            minHeight={'90vh'}
            // maxHeight={855}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <OverPopulatingSidebar
              isEditingSidebarOpen={isMobileSidebarOpen}
              onEditingSidebarClose={() => setMobileSidebarOpen(false)}
            />
          </Box>
  
          <Box flexGrow={1}>
            <EditOverPopulatingFloorView />
          </Box>
  
        </AppCard>
      </PageContainer>
    );
};

export default OverPopulatingEdit;
