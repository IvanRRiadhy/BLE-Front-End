import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery, Menu, Stack, Divider, Button } from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconMail, IconPower } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
import { useNavigate } from 'react-router';
import React, { useState } from 'react';
import { useProfile } from 'src/hooks/useProfile';
import { BASE_URL, CDN_URL, logoutUser } from 'src/utils/axios';

export const Profile = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = false;

  const navigate = useNavigate();

  const { data: profile } = useProfile();

  const fullName = profile?.fullName || localStorage.getItem('fullName') || profile?.username || localStorage.getItem('username') || 'Guest';
  const groupName = profile?.groupName || localStorage.getItem('groupName') || profile?.groupLevel || localStorage.getItem('levelPriority') || 'User';
  const email = profile?.email || localStorage.getItem('email') || '';
  const avatarSrc = profile?.profilePicture
    ? (profile.profilePicture.startsWith('http')
        ? profile.profilePicture
        : `${BASE_URL.replace(/\/+$/, '')}/${profile.profilePicture.replace(/^\/+/, '')}`)
    : img1;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar 
            alt={fullName} 
            src={avatarSrc} 
            onClick={handleClick}
            sx={{ cursor: 'pointer' }}
          />
          <Box>
            <Typography variant="h6">{fullName}</Typography>
            <Typography variant="caption">{groupName}</Typography>
          </Box>

          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton color="primary" onClick={handleLogout} size="small">
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>

          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            keepMounted
            open={open}
            onClose={handleClose}
            anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            sx={{
              '& .MuiMenu-paper': {
                width: '360px',
                p: 4,
              },
            }}
          >
            <Typography variant="h5">User Profile</Typography>
            <Stack direction="row" py={3} spacing={2} alignItems="center">
              <Avatar src={avatarSrc} alt={fullName} sx={{ width: 95, height: 95 }} />
              <Box>
                <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
                  {fullName}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  {groupName}
                </Typography>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <IconMail width={15} height={15} />
                  {email}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Box mt={2} gap={3}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  window.location.href = '/security-view/about';
                }}
                fullWidth
                sx={{ mb: 2 }}
              >
                About
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleLogout}
                fullWidth
              >
                Logout
              </Button>
            </Box>
          </Menu>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
