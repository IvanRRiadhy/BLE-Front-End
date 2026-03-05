import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import PatrolAssignmentEdit from 'src/components/master/Security/PatrolRoute/PatrolAssignment/PatrolAssignmentEdit';
import AppCard from 'src/components/shared/AppCard';
import { RootState, useSelector } from 'src/store/Store';

const drawerWidth = 240;
const PatrolAssignmentEditView = () => {
  const selectedRoute = useSelector(
    (state: RootState) => state.PatrolRouteReducer.selectedPatrolRoute,
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (selectedRoute) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [selectedRoute]);
  if (!selectedRoute && !loading) {
    window.location.href = '/master/patrolroute';
  }

  return (
    <PageContainer
      title="Edit Patrol Assignment"
      description="This is the edit patrol assignment page"
    >
      {/* <AppCard> */}
      <Box
        sx={{
          height: '90vh',
          display: 'grid',
          minHeight: 0,
          gridTemplateRows: 'auto 1fr auto',
          overflow: 'hidden',
        }}
      >
        <PatrolAssignmentEdit />
      </Box>
      {/* </AppCard> */}
    </PageContainer>
  );
};

export default PatrolAssignmentEditView;
