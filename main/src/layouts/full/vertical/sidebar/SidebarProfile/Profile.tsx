import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery, Menu, Stack, Divider, Button } from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconMail, IconPower } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
import { Link, useNavigate } from 'react-router';
import React, { useState } from 'react';

export const Profile = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

    const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // 🧹 Targeted logout: Clear session data but preserve "Remember this Device"
    const itemsToKeep = [
      'rememberedAdminUsername',
      'rememberedVisitorUsername',
      'rememberMePreference',
      'rememberedLoginMode',
    ];

    Object.keys(localStorage).forEach((key) => {
      if (!itemsToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    
    sessionStorage.clear();
    window.location.href = '/auth/login';
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
          {/* <Avatar alt="Remy Sharp" src={img1} /> */}

    {/* <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    > */}
      <Avatar 
        alt="Remy Sharp" 
        src={img1} 
        onClick={handleClick}
        sx={{ cursor: 'pointer' }}
      />
      <Box>
        <Typography variant="h6">{localStorage.getItem('username') || 'Guest'}</Typography>
        <Typography variant="caption">{localStorage.getItem('levelPriority') || 'User'}</Typography>
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
          <Avatar src={img1} alt="Profile" sx={{ width: 95, height: 95 }} />
          <Box>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
              {localStorage.getItem('fullName') || localStorage.getItem('username')}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {localStorage.getItem('groupName') || localStorage.getItem('levelPriority')}
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <IconMail width={15} height={15} />
              {localStorage.getItem('email') || 'No email'}
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <Box mt={2} gap={3}>
          {localStorage.getItem('levelPriority')?.toLowerCase() === 'superadmin' && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                window.location.href = '/about';
              }}
              fullWidth
              sx={{ mb: 2 }}
            >
              About
            </Button>
          )}
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
    {/* </Box> */}
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
