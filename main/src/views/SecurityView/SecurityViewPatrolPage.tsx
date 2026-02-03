import { Grid2 as Grid, Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import TopStatBox, { PaletteColorKey } from './SecurityViewDashboardCards/SecurityViewTopCards';
import SecurityViewAlarmDist from './SecurityViewDashboardCards/SecurityViewAlarmDist';
import SecurityViewAlarmLog from './SecurityViewDashboardCards/SecurityViewAlarmLog';
import SecurityViewPatrolList from './SecurityViewDashboardCards/SecurityViewPatrolList';
import PatrolAssignmentList from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolAssignmentList';

const stats = [
  { label: 'Patrol Today', value: 0, color: 'primary' },
  { label: 'Alarm', value: 0, color: 'error' },
  { label: 'Visitor', value: 0, color: 'success' },
  { label: 'Incident Reported', value: 0, color: 'warning' },
  { label: 'Investigation', value: 0, color: 'secondary' },
  { label: 'Placeholder', value: 0, color: 'info' },
];

const SecurityViewPatrolPage = () => {
  return (
    <PageContainer
      title="Security View Patrol Assignment"
      description="This is the security view patrol assignment page"
    >
      <Box>
        {/* <Grid container spacing={2} mt={1}>
          <Grid
            container
            spacing={2}
            size={{ xs: 12, md: 6, lg: 3 }} // mobile → 1 column tablet → 2 columns desktop → 3 columns
          >
            {stats.map((item, idx) => (
              <Grid
                key={idx}
                size={{ xs: 4, sm: 4, md: 6 }} // mobile → 2 columns tablet → 3 columns desktop → try 3 columns
              >
                <TopStatBox
                  label={item.label}
                  value={item.value}
                  color={item.color as PaletteColorKey}
                />
              </Grid>
            ))}
          </Grid>
          <Grid
            key={'bar-chart'}
            size={{ xs: 12, sm: 12, md: 5 }} // full width
          >
            <SecurityViewPatrolList />
          </Grid>
          <Grid
            key={'Alarm Log'}
            size={{ xs: 12, sm: 12, md: 4 }} // full width
          >
            <SecurityViewAlarmLog />
          </Grid>
        </Grid> */}
        <Grid container spacing={2} mt={1}>
          <PatrolAssignmentList />
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default SecurityViewPatrolPage;
