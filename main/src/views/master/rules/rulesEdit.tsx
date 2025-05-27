import { useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import { RootState, useSelector } from 'src/store/Store';
import RulesSidebar from 'src/components/master/rules/rulesSidebar';
import RulesCanvas from 'src/components/master/rules/rulesCanvas';
import Canvas from 'src/components/master/rules/Canvas/Canvas';

const rulesEdit = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  return (
    <PageContainer title="Rules" description="Rules">
      <AppCard>
        <Box
          display="flex"
          flexDirection="column"
          minHeight={800}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <RulesSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </Box>
        <Box flexGrow={1}>
          {/* <RulesCanvas /> */}
          <Canvas />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default rulesEdit;
