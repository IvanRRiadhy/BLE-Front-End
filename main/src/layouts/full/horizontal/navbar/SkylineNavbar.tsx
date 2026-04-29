import React, { useState, useCallback } from 'react';
import { Box, Stack, Button, Menu, MenuItem, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { NavLink, useLocation } from 'react-router';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import useMenuItems from './Menudata';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

// --- Recursive SubMenu Component (Simple Hover Only) ---
interface SubMenuProps {
  item: any;
  onCloseAll: () => void;
}

const SkylineSubMenu = ({ item, onCloseAll }: SubMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { pathname } = useLocation();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const checkActive = (navItem: any): boolean => {
    if (navItem.href && pathname === navItem.href) return true;
    if (navItem.children) {
      return navItem.children.some((child: any) => checkActive(child));
    }
    return false;
  };

  const isActive = checkActive(item);

  if (item.children) {
    return (
      <div onMouseLeave={handleClose}>
        <MenuItem
          onMouseEnter={handleOpen}
          sx={{ 
            minWidth: 200, 
            display: 'flex', 
            justifyContent: 'space-between', 
            py: 1.2,
            color: (isActive || open) ? 'primary.main' : 'inherit',
            fontWeight: (isActive || open) ? 600 : 400,
          }}
        >
          <Box display="flex" alignItems="center">
            {item.icon && (
              <ListItemIcon sx={{ minWidth: 35, color: 'inherit' }}>
                <item.icon stroke={1.5} size="1.1rem" />
              </ListItemIcon>
            )}
            <ListItemText primary={item.title} primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 'inherit' }} />
          </Box>
          <IconChevronRight size="1rem" />
        </MenuItem>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          sx={{ pointerEvents: 'none' }}
          PaperProps={{
            sx: { pointerEvents: 'auto', mt: -1, ml: 0.5, boxShadow: (theme) => theme.shadows[8] }
          }}
          MenuListProps={{
            onMouseLeave: handleClose
          }}
        >
          {item.children.map((child: any) => (
            <SkylineSubMenu key={child.id || child.title} item={child} onCloseAll={onCloseAll} />
          ))}
        </Menu>
      </div>
    );
  }

  return (
    <MenuItem
      // @ts-ignore
      component={item.external ? 'a' : NavLink}
      {...(item.external ? { href: item.href, target: '_blank' } : { to: item.href })}
      onClick={onCloseAll}
      sx={{ 
        minWidth: 200, 
        py: 1.2,
        color: isActive ? 'primary.main' : 'inherit',
        fontWeight: isActive ? 600 : 400,
        bgcolor: isActive ? 'primary.light' : 'transparent',
      }}
    >
      {item.icon && (
        <ListItemIcon sx={{ minWidth: 35, color: 'inherit' }}>
          <item.icon stroke={1.5} size="1.1rem" />
        </ListItemIcon>
      )}
      <ListItemText primary={item.title} primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 'inherit' }} />
    </MenuItem>
  );
};

// --- Main Navbar Component ---
const SkylineNavbar = () => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const alarmSettings = useSelector((state: RootState) => state.AlarmSettingReducer.alarmSettingAll);
  const customizer = useSelector((state: RootState) => state.customizer);
  const menuItems = useMenuItems(alarmSettings);

  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [lockedTitle, setLockedTitle] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const checkActive = useCallback((navItem: any): boolean => {
    if (navItem.href && pathname === navItem.href) return true;
    if (navItem.children) {
      return navItem.children.some((child: any) => checkActive(child));
    }
    return false;
  }, [pathname]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>, title: string) => {
    if (lockedTitle) return; 
    setAnchorEl(event.currentTarget);
    setActiveTitle(title);
  };

  const handleClose = () => {
    if (!lockedTitle) {
      setAnchorEl(null);
      setActiveTitle(null);
    }
  };

  const handleToggleLock = (event: React.MouseEvent<HTMLElement>, title: string) => {
    if (lockedTitle === title) {
      setLockedTitle(null);
      setAnchorEl(null);
      setActiveTitle(null);
    } else {
      setLockedTitle(title);
      setAnchorEl(event.currentTarget);
      setActiveTitle(title);
    }
  };

  const handleGlobalClose = () => {
    setLockedTitle(null);
    setAnchorEl(null);
    setActiveTitle(null);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        {menuItems.map((item) => {
          const isCurrentActive = activeTitle === item.title;
          const isCurrentLocked = lockedTitle === item.title;
          const isActivePath = checkActive(item);

          if (item.children) {
            return (
              <Box key={item.title} onMouseLeave={handleClose}>
                <Button
                  onMouseEnter={(e) => handleOpen(e, item.title)}
                  onClick={(e) => handleToggleLock(e, item.title)}
                  endIcon={<IconChevronDown size="1rem" />}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: `${customizer.borderRadius}px`,
                    textTransform: 'none',
                    fontSize: '15px',
                    fontWeight: isActivePath ? 600 : 400,
                    backgroundColor: (isCurrentActive || isCurrentLocked)
                      ? theme.palette.primary.light
                      : (isActivePath ? theme.palette.primary.main : 'transparent'),
                    color: (isCurrentActive || isCurrentLocked)
                      ? theme.palette.primary.main
                      : (isActivePath ? 'white' : theme.palette.text.secondary),
                    '&:hover': {
                      backgroundColor: isActivePath ? theme.palette.primary.main : theme.palette.primary.light,
                      color: isActivePath ? 'white' : theme.palette.primary.main,
                    },
                    opacity: (lockedTitle && !isCurrentLocked) ? 0.5 : 1,
                    pointerEvents: (lockedTitle && !isCurrentLocked) ? 'none' : 'auto',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {item.title}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={isCurrentActive || isCurrentLocked}
                  onClose={handleGlobalClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  sx={{ pointerEvents: isCurrentLocked ? 'auto' : 'none' }}
                  PaperProps={{
                    sx: { 
                      pointerEvents: 'auto', 
                      mt: 0.5, 
                      boxShadow: theme.shadows[8],
                      borderRadius: `${customizer.borderRadius}px`,
                      minWidth: '200px'
                    }
                  }}
                  MenuListProps={{
                    onMouseEnter: () => {}, 
                    onMouseLeave: handleClose
                  }}
                >
                  {item.children.map((child: any) => (
                    <SkylineSubMenu key={child.id || child.title} item={child} onCloseAll={handleGlobalClose} />
                  ))}
                </Menu>
              </Box>
            );
          }

          return (
            <Button
              key={item.title}
              component={NavLink}
              to={item.href}
              sx={{
                px: 2,
                py: 1,
                borderRadius: `${customizer.borderRadius}px`,
                textTransform: 'none',
                fontSize: '15px',
                fontWeight: isActivePath ? 600 : 400,
                backgroundColor: isActivePath ? theme.palette.primary.main : 'transparent',
                color: isActivePath ? 'white' : theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: isActivePath ? theme.palette.primary.main : theme.palette.primary.light,
                  color: isActivePath ? 'white' : theme.palette.primary.main,
                },
                opacity: lockedTitle ? 0.5 : 1,
                pointerEvents: lockedTitle ? 'none' : 'auto',
                transition: 'all 0.3s ease',
              }}
            >
              {item.title}
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
};

export default SkylineNavbar;
