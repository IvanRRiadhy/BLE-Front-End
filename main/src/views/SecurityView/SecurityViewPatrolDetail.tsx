import { Grid2 as Grid, Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import TopStatBox, { PaletteColorKey } from './SecurityViewDashboardCards/SecurityViewTopCards';
import SecurityViewAlarmDist from './SecurityViewDashboardCards/SecurityViewAlarmDist';
import SecurityViewAlarmLog from './SecurityViewDashboardCards/SecurityViewAlarmLog';
import SecurityViewPatrolList from './SecurityViewDashboardCards/SecurityViewPatrolList';
import PatrolAssignmentList from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolAssignmentList';
import PatrolDetailPage from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolAssignmentDetailPage';
import { RootState, useSelector } from 'src/store/Store';
import { useNavigate } from 'react-router';

const stats = [
  { label: 'Patrol Today', value: 0, color: 'primary' },
  { label: 'Alarm', value: 0, color: 'error' },
  { label: 'Visitor', value: 0, color: 'success' },
  { label: 'Incident Reported', value: 0, color: 'warning' },
  { label: 'Investigation', value: 0, color: 'secondary' },
  { label: 'Placeholder', value: 0, color: 'info' },
];

const SecurityViewPatrolPage = () => {
  const navigate = useNavigate();
  const detail = useSelector(
    (state: RootState) => state.PatrolSessionReducer.selectedPatrolAssignment,
  );
  if(!detail) {
    window.location.href = '/security-view/patrol-assignment';
  }
  return (
    <PageContainer
      title="Security View Patrol Assignment"
      description="This is the security view patrol assignment page"
    >
      <Box>
        {detail && <PatrolDetailPage data={detail} />}
      </Box>
    </PageContainer>
  );
};

export default SecurityViewPatrolPage;
