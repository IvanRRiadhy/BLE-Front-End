import { useState } from 'react';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import FloorplanSidebar from 'src/components/master/floorplan/FloorplanSidebar';
import FloorplanView from 'src/components/master/floorplan/FloorplanView';

const Floorplan = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  return (
    <PageContainer title="Floorplan" description="this is floorplan page">
      <Breadcrumb title="Floorplan App" subtitle="See the floorplan" />
      <AppCard>
        <Box display="flex" flexDirection="column">
          <FloorplanSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </Box>
        <Box flexGrow={1}>
          <FloorplanView />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default Floorplan;
