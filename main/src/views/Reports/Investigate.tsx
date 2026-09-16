import { useState } from 'react';
import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import InvestigateFilter from 'src/components/master/Reports/Investigation/InvestigateFilter';
import InvestigateContent from 'src/components/master/Reports/Investigation/InvestigateContent';
import { VisitorSessionResponseType } from 'src/store/apps/crud/visitorSession';

const Investigate = () => {
  const [showReport, setShowReport] = useState(false);
  const [sessionData, setSessionData] = useState<VisitorSessionResponseType | null>(null);

  const handleInvestigateSuccess = (data: VisitorSessionResponseType) => {
    setSessionData(data);
    setShowReport(true);
  };

  const handleBack = () => {
    setShowReport(false);
    setSessionData(null);
  };

  return (
    <PageContainer title="People Tracking System" description="this is Investigation Page">
      <AppCard>
        {/* Filter View: Visible initially, hidden after API response */}
        <Box
          sx={{
            display: showReport ? 'none' : 'flex',
            width: '100%',
            justifyContent: 'center',
            p: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 540 }}>
            <InvestigateFilter onInvestigateSuccess={handleInvestigateSuccess} />
          </Box>
        </Box>

        {/* Tracking Report View: Shown after API response, removed on Back */}
        {showReport && (
          <Box sx={{ width: '100%' }}>
            <InvestigateContent
              initialSessionData={sessionData}
              onBack={handleBack}
            />
          </Box>
        )}
      </AppCard>
    </PageContainer>
  );
};

export default Investigate;