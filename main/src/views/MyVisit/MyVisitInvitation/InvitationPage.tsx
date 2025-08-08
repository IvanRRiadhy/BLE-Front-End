import { useState } from 'react';
import {
  Drawer,
  useMediaQuery,
  Theme,
  Grid2 as Grid,
  Box,
  CardContent,
  Typography,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import { RootState, useSelector } from 'src/store/Store';
import ParentCard from 'src/components/shared/ParentCard';
import { useTranslation } from 'react-i18next';
import InvitationList from 'src/components/my-visit/Invite/InvitationList';
import InviteForm from 'src/components/my-visit/Invite/InviteForm';

interface cardType {
  icon?: string;
  title: string;
  subtitle: string;
  bgcolor: string;
}

const drawerWidth = 320;

const InvitationPage = () => {
      const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
    const { t } = useTranslation();

    return (
        <PageContainer title="Invitation Page" description='Invite Visitor/Member'>
            <Grid container spacing={3} mb={3}>

            </Grid>
                  <AppCard>
                    <Drawer
                      anchor="right"
                      open={isRightSidebarOpen}
                      onClose={() => setRightSidebarOpen(false)}
                      variant={mdUp ? 'permanent' : 'temporary'}
                      sx={{
                        width: mdUp ? drawerWidth : '100%',
                        zIndex: lgUp ? 0 : 1,
                        flex: mdUp ? 'auto' : '',
                        [`& .MuiDrawer-paper`]: { width: '100%', position: 'relative' },
                      }}
                    >
                      <ParentCard title="Invitation List" codeModel={[
                        <InviteForm key="InviteForm" />
                      ]}>
                        <InvitationList />
                      </ParentCard>
                    </Drawer>
                  </AppCard>
        </PageContainer>
    )
};

export default InvitationPage;