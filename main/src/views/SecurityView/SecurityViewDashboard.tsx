import { Grid2 as Grid, Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import TopStatBox, { PaletteColorKey } from './SecurityViewDashboardCards/SecurityViewTopCards';
import SecurityViewAlarmDist from './SecurityViewDashboardCards/SecurityViewAlarmDist';
import SecurityViewAlarmLog from './SecurityViewDashboardCards/SecurityViewAlarmLog';
import SecurityViewPatrolList from './SecurityViewDashboardCards/SecurityViewPatrolList';
import PatrolAssignmentList from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolAssignmentList';
import {
  securityViewDashboardFilterType,
  useSecurityViewDashboard,
} from 'src/hooks/useSecurityViewDashboard';
import NextPatrolBox from './SecurityViewDashboardCards/SecurityViewNextPatrolBox';

const stats = [
  { label: 'Patrol Today', value: 0, color: 'primary' },
  { label: 'Alarm', value: 0, color: 'error' },
  { label: 'Visitor', value: 0, color: 'success' },
  { label: 'Incident Reported', value: 0, color: 'warning' },
  { label: 'Investigation', value: 0, color: 'secondary' },
  { label: 'Placeholder', value: 0, color: 'info' },
];

const SecurityViewDashboard = () => {
  const dashboardFilter: securityViewDashboardFilterType = {
    timeRange: 'today',
    floorplanMaskedAreaId: null,
    operatorName: null,
    visitorId: null,
    buildingId: null,
    floorId: null,
  };
  const { data: dashboardData = {} } = useSecurityViewDashboard(dashboardFilter);
  console.log('dashboardData: ', dashboardData);

  const stats = [
    {
      label: 'Patrol Today',
      value: dashboardData?.countPatrolAssignment ?? '0',
      color: 'primary',
    },
    {
      label: 'Alarm',
      value: dashboardData?.countAlarmToInvestigate ?? '0',
      color: 'error',
    },
    {
      label: 'Avg Response',
      value: dashboardData?.avgResponseTimeMetric?.split(' ')[0] ?? 0,
      unit: 'seconds',
      color: 'info',
    },
    {
      label: 'Patrol Apalah',
      value: dashboardData?.apalah ?? '0',
      color: 'primary',
    },
    {
      label: 'Alarm',
      value: dashboardData?.countAlarmToInvestigate ?? 0,
      color: 'error',
    },
    {
      label: 'Avg Response',
      value: dashboardData?.avgResponseTimeMetric?.split(' ')[0] ?? 0,
      unit: 'seconds',
      color: 'info',
    },
  ];

  // const NextPatrolBox = ({ nextPatrol }: any) => {
  //   if (!nextPatrol) {
  //     return <TopStatBox label="Next Patrol" value="No Patrol" color="secondary" />;
  //   }

  //   return (
  //     <TopStatBox
  //       label={nextPatrol.assignmentName}
  //       value={`${nextPatrol.scheduleStart} - ${nextPatrol.scheduleEnd}`}
  //       color="secondary"
  //     />
  //   );
  // };

  return (
    <PageContainer
      title="Security View Dashboard"
      description="This is the security view dashboard page"
    >
      <Box>
        <Grid container spacing={2} mt={1}>
          <Grid container direction="column" spacing={2} size={{ xs: 12, md: 6, lg: 3 }}>
            {/* TOP 2/3 */}
            <Grid size={12}>
              <Grid container spacing={2}>
                {stats.map((item, idx) => (
                  <Grid key={idx} size={{ xs: 4, sm: 4, md: 4 }}>
                    <TopStatBox
                      label={item.label}
                      value={item.value}
                      unit={item.unit}
                      color={item.color as PaletteColorKey}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* BOTTOM 1/3 */}
            <Grid size={12}>
              <NextPatrolBox nextPatrol={dashboardData?.nextPatrol} />
            </Grid>
          </Grid>
          <Grid
            key={'Patrol-List'}
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
        </Grid>
        {/* <Grid container spacing={2} mt={1}>
          <PatrolAssignmentList />
        </Grid> */}
      </Box>
    </PageContainer>
  );
};

export default SecurityViewDashboard;
