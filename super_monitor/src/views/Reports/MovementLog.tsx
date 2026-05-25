import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import MovementLogList from 'src/components/master/Reports/MovementLog/MovementLogList';

const MovementLog = () => {
  return (
    <PageContainer title="People Tracking System" description="Display the last detected area of each person">
      <AppCard>
        <Box
          sx={{
            p: 3,
            minWidth: '100%',
            width: '100%',
            flexShrink: 0,
          }}
        >
            <MovementLogList />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default MovementLog;
