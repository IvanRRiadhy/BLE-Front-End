import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import CardHistoryList from 'src/components/master/Reports/CardHistory/CardHIstoryList';

const drawerWidth = 320;
const secdrawerWidth = 320;

const CardHistory = () => {
    const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
    const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
    const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

    return (
        <PageContainer title="Card History" description="this is Card History Page">
            <AppCard>
                {/* ------------------------------------------- */}
        {/* Left Part */}
        {/* ------------------------------------------- */}
        <Box
          sx={{
            minWidth: secdrawerWidth,
            width: { xs: '100%', md: secdrawerWidth, lg: secdrawerWidth },
            flexShrink: 0,
          }}
        >
          {/* <IntruderList /> */}
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
                  <CardHistoryList />
                </Drawer>
            </AppCard>
        </PageContainer>
    )

};
export default CardHistory;