import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import VisitorReportFilter from 'src/components/master/Reports/TestReport/TestReportFilter';

const TestReport = () => {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  return (
    <PageContainer title="Test Report" description="this is Test Report Page">
      <AppCard>
        <Box
          sx={{
            p: 3,
            minWidth: '100%',
            width: '100%',
            flexShrink: 0,
          }}
        >
            <VisitorReportFilter />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default TestReport;
