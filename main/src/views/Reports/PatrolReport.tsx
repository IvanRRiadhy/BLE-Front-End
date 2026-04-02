import { useState, useEffect } from 'react';
import {
  Drawer,
  useMediaQuery,
  Theme,
  CircularProgress,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import PatrolAssignmentList from 'src/components/master/Reports/PatrolReport/PatrolAssignmentList';
import PatrolReportContent from 'src/components/master/Reports/PatrolReport/PatrolReportContent';
// import { SecurityType } from 'src/store/apps/crud/alarmTrigger';
import { SecurityType } from 'src/store/apps/crud/patrolRoute';
import { RootState, useSelector } from 'src/store/Store';
import PatrolReportSessionContent from 'src/components/master/Reports/PatrolReport/PatrolSessionContent';
import PatrolAssignmentSearch from 'src/components/master/Reports/PatrolReport/PatrolAssignmentSearch';
import PatrolReportFilter from 'src/components/master/Reports/PatrolReport/PatrolReportFilter';

const drawerWidth = 240;
const secdrawerWidth = 320;

const PatrolReport = () => {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  const patrolAssign = useSelector(
    (state: RootState) => state.PatrolRouteReducer.selectedPatrolAssign,
  );

  const [selectedSecurity, setSelectedSecurity] = useState<SecurityType | null>(null);
  useEffect(() => {
    setSelectedSecurity(null);
  }, [patrolAssign?.id]);
  return (
    <PageContainer title="Patrol Route" description="this is Patrol Route Page">
      <AppCard>
        {/* ------------------------------------------- */}
        {/* Left Part */}
        {/* ------------------------------------------- */}
        <Drawer
          open={isLeftSidebarOpen}
          onClose={() => setLeftSidebarOpen(false)}
          sx={{
            width: drawerWidth,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, position: 'relative', zIndex: 2 },
            flexShrink: 0,
          }}
          variant={lgUp ? 'permanent' : 'temporary'}
        >
          <PatrolAssignmentSearch onClick={() => setLeftSidebarOpen(true)} />
          <PatrolAssignmentList />
        </Drawer>
        {/* ------------------------------------------- */}
        {/* Main part */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="right"
          open={isRightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          variant={mdUp ? 'permanent' : 'temporary'}
          sx={{
            width: mdUp ? secdrawerWidth : '100%',
            zIndex: lgUp ? 0 : 1,
            flex: mdUp ? 'auto' : '',
            [`& .MuiDrawer-paper`]: { width: '100%', position: 'relative' },
          }}
        >
          {patrolAssign !== null && patrolAssign !== undefined ? (
            selectedSecurity ? (
              <PatrolReportSessionContent
                sec={selectedSecurity}
                patrol={patrolAssign}
                onSecurityClick={setSelectedSecurity}
              />
            ) : (
              <PatrolReportContent patrol={patrolAssign} onSecurityClick={setSelectedSecurity} />
            )
          ) : (
            <PatrolReportFilter />
          )}
        </Drawer>
      </AppCard>
    </PageContainer>
  );
};

export default PatrolReport;
