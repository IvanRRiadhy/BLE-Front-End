import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import PatrolAssignmentEdit from 'src/components/master/Security/PatrolRoute/PatrolAssignment/PatrolAssignmentEdit';
import AppCard from 'src/components/shared/AppCard';

const drawerWidth = 240;
const PatrolAssignmentEditView = () => {
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
  )
};

export default PatrolAssignmentEditView;    