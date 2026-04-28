import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import ReaderReportFilter from 'src/components/master/Reports/ReaderReport/ReaderReportFilter';

const ReaderReport = () => {
  return (
    <PageContainer title="Reader Report" description="this is Reader Report Page">
      <AppCard>
        <Box
          sx={{
            p: 3,
            minWidth: '100%',
            width: '100%',
            flexShrink: 0,
          }}
        >
          <ReaderReportFilter />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default ReaderReport;
