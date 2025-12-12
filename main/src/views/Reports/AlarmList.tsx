import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import VisitorSearch from 'src/components/master/Tag/visitor/visitorSearch';
import VisitorList from 'src/components/master/Tag/visitor/trxvisitorlist/trxVisitorList';
import VisitorFilter from 'src/components/master/Tag/visitor/visitorFilter';
import AlarmContent from 'src/components/master/Reports/AlarmList/alarmContent';
import IntruderList from 'src/components/master/Reports/AlarmList/IntruderList';

const drawerWidth = 320;
const secdrawerWidth = 320;


const AlarmList = () => {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  return (
    <PageContainer title="Alarm List" description="this is Alarm List Page">
        <AppCard>
        {/* ------------------------------------------- */}
        {/* Left Part */}
        {/* ------------------------------------------- */}

        {/* <Drawer
          open={isLeftSidebarOpen}
          onClose={() => setLeftSidebarOpen(false)}
          sx={{
            width: drawerWidth,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, position: 'relative', zIndex: 2 },
            flexShrink: 0,
          }}
          variant={ 'permanent'}
        >
          <VisitorFilter />
        </Drawer> */}

        {/* ------------------------------------------- */}
        {/* Middle part */}
        {/* ------------------------------------------- */}
        <Box
          sx={{
            minWidth: secdrawerWidth,
            width: { xs: '100%', md: secdrawerWidth, lg: secdrawerWidth },
            flexShrink: 0,
          }}
        >
          {/* <VisitorSearch onClick={() => setLeftSidebarOpen(true)} /> */}
          <IntruderList />
        </Box>
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
                  {/* back btn Part */}
                  {mdUp ? (
                    ''
                  ) : (
                    <Box sx={{ p: 3 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => setRightSidebarOpen(false)}
                        sx={{ mb: 3, display: { xs: 'block', md: 'none', lg: 'none' } }}
                      >
                        Back{' '}
                      </Button>
                    </Box>
                  )}
                  <AlarmContent />
                </Drawer>
        </AppCard>
    </PageContainer>
  )

};

export default AlarmList;