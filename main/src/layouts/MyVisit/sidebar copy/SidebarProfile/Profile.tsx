import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconPower } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
import { useProfile } from 'src/hooks/useProfile';
import { BASE_URL, CDN_URL, logoutUser } from 'src/utils/axios';

export const Profile = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  const { data: profile } = useProfile();
  const fullName = profile?.fullName || localStorage.getItem('fullName') || profile?.username || localStorage.getItem('username') || 'Guest';
  const groupName = profile?.groupName || localStorage.getItem('groupName') || profile?.groupLevel || localStorage.getItem('levelPriority') || 'User';
  const avatarSrc = profile?.profilePicture
    ? (profile.profilePicture.startsWith('http')
        ? profile.profilePicture
        : `${BASE_URL.replace(/\/+$/, '')}/${profile.profilePicture.replace(/^\/+/, '')}`)
    : img1;

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt={fullName} src={avatarSrc} />

          <Box>
            <Typography variant="h6">{fullName} </Typography>
            <Typography variant="caption">{groupName}</Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton
                color="primary"
                onClick={logoutUser}
                aria-label="logout"
                size="small"
              >
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
