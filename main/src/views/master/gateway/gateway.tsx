import { useState } from 'react';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import Gateway from 'src/components/master/gateway/gateway';
import AppCard from 'src/components/shared/AppCard';
import { Box, Divider } from '@mui/material';
import FloorSidebar from 'src/components/master/gateway/FloorSidebar';
import GatewaySidebar from 'src/components/master/gateway/GatewaySidebar';

const GatewayApp = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  return (
    <PageContainer title="Gateway" description="this is gateway page">
      <Breadcrumb title="Gateway App" subtitle="See the gateway" />
      <AppCard>
        <Box display="flex" flexDirection="column">
          <FloorSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          <Divider />
          <GatewaySidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </Box>

        <Box flexGrow={1}>
          <Gateway />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default GatewayApp;
