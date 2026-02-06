import { useMemo, useState } from 'react';
import {
  Drawer,
  useMediaQuery,
  Theme,
  Grid2 as Grid,
  Box,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { RootState, useSelector } from 'src/store/Store';
import ParentCard from 'src/components/shared/ParentCard';
import { useTranslation } from 'react-i18next';
import UserList from 'src/components/master/User/userList';
import CreateUser from 'src/components/master/User/CreateUser';
import BlankCard from 'src/components/shared/BlankCard';
import { useAllUserGroups } from 'src/hooks/useUser';
import { LEVEL_PRIORITY_ORDER } from 'src/store/apps/crud/users';
import UserGroupList from 'src/components/master/User/Group/UserGroupList';
import TabbedParentCard from 'src/components/shared/TabbedParentCard';

interface cardType {
  icon?: string;
  title: string;
  subtitle: string;
  bgcolor: string;
}

const drawerWidth = 320;

const User = () => {
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const userList = useSelector((state: RootState) => state.userReducer.users);
  const { data: groups = [], isLoading } = useAllUserGroups();

  // const groups = data?.collection?.data ?? [];
  const { t } = useTranslation();

  const groupedByLevel = useMemo(() => {
    const map: Record<string, typeof groups> = {};

    LEVEL_PRIORITY_ORDER.forEach((lvl) => {
      map[lvl] = [];
    });

    groups.forEach((g) => {
      if (!map[g.levelPriority]) {
        map[g.levelPriority] = [];
      }
      map[g.levelPriority].push(g);
    });

    return map;
  }, [groups]);
  const userCountByLevel = useMemo(() => {
    const result: Record<string, number> = {};

    LEVEL_PRIORITY_ORDER.forEach((lvl) => {
      result[lvl] = 0;
    });

    groups.forEach((group) => {
      const level = group.levelPriority;
      result[level] = (result[level] ?? 0) + (group.members?.length ?? 0);
    });

    return result;
  }, [groups]);

  const topCards: cardType[] = [
    {
      title: 'Total Users',
      subtitle: userList.length.toString(),
      bgcolor: 'success',
    },
    ...LEVEL_PRIORITY_ORDER.map((level) => ({
      title: level,
      subtitle: (userCountByLevel[level] ?? 0).toString(),
      bgcolor: 'primary',
    })),
  ];
  const tabs = LEVEL_PRIORITY_ORDER.map((level) => ({
  key: level,
  title: level,
  badge: (
    <Box
      sx={{
        px: 1,
        borderRadius: 1,
        fontSize: 12,
        bgcolor: 'primary.light',
      }}
    >
      {userCountByLevel[level] ?? 0}
    </Box>
  ),
  content: (
    <UserGroupList
      groups={groupedByLevel[level]}
      isLoading={isLoading}
      levelPriority={level}
    />
  ),
}));

  
  return (
    <PageContainer title="User Groups" description="User groups by level priority">
      {/* <Breadcrumb title="User Table" /> */}
      <Grid container spacing={3} mb={3}>
        {topCards.map((topcard, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4, lg: 2 }}>
            <Box bgcolor={topcard.bgcolor + '.light'} textAlign="center">
              <CardContent>
                <Typography
                  color={topcard.bgcolor + '.dark'}
                  mt={1}
                  variant="subtitle1"
                  fontWeight={600}
                  fontSize={13}
                >
                  {t(`${topcard.title}`)}
                </Typography>
                <Typography
                  color={topcard.bgcolor + '.main'}
                  variant="h4"
                  fontWeight={600}
                  fontSize={25}
                >
                  {topcard.subtitle}
                </Typography>
              </CardContent>
            </Box>
          </Grid>
        ))}
      </Grid>
      {/* <AppCard>
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
          <ParentCard title="User List" codeModel={<CreateUser key={'createUser'} />}>
            <UserList />
          </ParentCard>
        </Drawer>
      </AppCard> */}
      <Grid container spacing={3}>
        <TabbedParentCard tabs={tabs} defaultActiveKey='SuperAdmin' />
        {/* {LEVEL_PRIORITY_ORDER.map((level) => {
          const levelGroups = groupedByLevel[level];
          return (
            <Grid key={level} size={12}>
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
                  <ParentCard title={level} codeModel={<CreateUser key={'createUser'} />}>
                    <UserGroupList groups={levelGroups} isLoading={isLoading} />
                  </ParentCard>
                </Drawer>
              </AppCard>
            </Grid>
          );
        })} */}
      </Grid>
    </PageContainer>
  );
};

export default User;
