import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import PatrolDetailPage from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolAssignmentDetailPage';
import { useSearchParams, useNavigate } from 'react-router';
import { useEffect } from 'react';

const SecurityViewPatrolPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = searchParams.get('id');

  // If no id in URL → redirect back to list
  // useEffect(() => {
  //   if (!id) {
  //     navigate('/security-view/patrol-assignment', { replace: true });
  //   }
  // }, [id, navigate]);

  // if (!id) return null;

  return (
    <PageContainer
      title="Security View Patrol Assignment"
      description="This is the security view patrol assignment page"
    >
      <Box>
        <PatrolDetailPage />
      </Box>
    </PageContainer>
  );
};

export default SecurityViewPatrolPage;
