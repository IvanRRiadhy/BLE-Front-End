import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import CardHistoryTable from 'src/components/master/Reports/CardHistory/CardHIstoryList copy';

const secdrawerWidth = 320;

const CardHistory = () => {
    const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
    const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
    const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

    return (
        <PageContainer title="People Tracking System" description="this is Card History Page">
            <AppCard>
                {/* ------------------------------------------- */}
        {/* Left Part */}
        {/* ------------------------------------------- */}
        {/* <Box
          sx={{
            minWidth: secdrawerWidth,
            width: { xs: '100%', md: secdrawerWidth, lg: secdrawerWidth },
            flexShrink: 0,
          }}
        >

        </Box> */}
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
                  <CardHistoryTable />
                </Drawer>
            </AppCard>
        </PageContainer>
    )

};
export default CardHistory;