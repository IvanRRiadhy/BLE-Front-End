import { Box, Grid2 as Grid, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { visitorData } from './DummyVisitorData';
import { trackingData } from './trackingData';
import { invitationData } from './invitationData';
import VisitCounterCard from './MyVisitDashboardCards/VisitCounterCard';
import VisitAreaCard from './MyVisitDashboardCards/VisitAreaCard';
import VisitFrequencyCard from './MyVisitDashboardCards/VisitFrequencyCard';
const visitorId = '123456';

const MyVisitDashboard = () => {
  const visitor = visitorData.find((item) => item.id === visitorId);
  const filteredTrackingData = trackingData.filter((item) => item.visitorId === visitorId);
  const filteredInvitationData = invitationData.filter((item) => item.visitorId === visitorId);

  return (
    <PageContainer title="Dashboard" description="this is dashboard page">
      <Box>
        <Grid container spacing={3} mb={3}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2,
            }}
          >
            <VisitCounterCard invitations={filteredInvitationData} title="Remaining Invitations" />
            {/* <Typography variant="h4">My Visit</Typography> */}
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 4,
            }}
          >
            <VisitAreaCard
              invitationData={filteredInvitationData}
              trackingData={filteredTrackingData}
              title="Most Visited Areas"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 6,
            }}
          >
            <VisitFrequencyCard
              trackingData={filteredTrackingData}
              title="Tracking Count by Date"
            />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default MyVisitDashboard;
