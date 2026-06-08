import { Grid2 as Grid, Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AlarmInvestigation from 'src/components/security-view/AlarmInvestigate/AlarmInvestigation';

const SecurityViewAlarmInvestigatePage = () => {
  return (
    <PageContainer
      title="Security View Alarm Investigation"
      description="This is the security view alarm investigation page"
    >
      <Box>
        <Grid container spacing={2} mt={1}>
          <AlarmInvestigation />
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default SecurityViewAlarmInvestigatePage;
