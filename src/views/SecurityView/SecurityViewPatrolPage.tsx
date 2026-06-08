import { Grid2 as Grid, Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import PatrolAssignmentList from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolAssignmentList';

const SecurityViewPatrolPage = () => {
  return (
    <PageContainer
      title="Security View Patrol Assignment"
      description="This is the security view patrol assignment page"
    >
      <Box>
        <Grid container spacing={2} mt={1}>
          <PatrolAssignmentList />
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default SecurityViewPatrolPage;
