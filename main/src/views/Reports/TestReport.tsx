import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import VisitorReportFilter from 'src/components/master/Reports/TestReport/TestReportFilter';
import VisitorReportFilterPreset from 'src/components/master/Reports/TestReport/VisitorReportFilterPreset';
import { VisitorFilterPresetType } from 'src/store/apps/crud/visitorFilterPreset';

const TestReport = () => {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<Partial<VisitorFilterPresetType> | null>(null);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
    const handleApplyPreset = (preset: VisitorFilterPresetType) => {
    setCurrentFilter(preset);
    // You can also pass this to your VisitorReportFilter component if needed
    console.log('Applied preset:', preset);
  };

  const handleGenerateReport = () => {
    // Implement your report generation logic here
    console.log('Generating report with filter:', currentFilter);
    // You can use the currentFilter state to generate the report
  };

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
            <VisitorReportFilterPreset
              onApplyPreset={handleApplyPreset}
              onGenerateReport={handleGenerateReport}
              />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default TestReport;
