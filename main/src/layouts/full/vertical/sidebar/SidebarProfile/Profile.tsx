import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconPower } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
import { Link, useNavigate } from 'react-router';

export const Profile = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

    const navigate = useNavigate();

  const handleLogout = () => {
  localStorage.clear();
  sessionStorage.clear(); // optional

  // Clear all in-memory Redux or MQTT states if necessary
  // e.g. dispatch(clearUserData());

  // Navigate AFTER the cleanup is done
  setTimeout(() => {
    navigate('/auth/login', { replace: true });
  }, 50);
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
      <Avatar alt="Remy Sharp" src={img1} />
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
    {/* </Box> */}
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
