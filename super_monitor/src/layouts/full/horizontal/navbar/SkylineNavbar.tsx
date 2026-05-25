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
  const closeTimeout = React.useRef<any>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    closeTimeout.current = setTimeout(() => {
      setAnchorEl(null);
    }, 100);
  };

  const handleMenuEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
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
      <div onMouseLeave={handleClose} onMouseEnter={handleMenuEnter}>
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
            sx: { pointerEvents: 'auto', mt: -1, boxShadow: (theme) => theme.shadows[8] }
          }}
          MenuListProps={{
            onMouseEnter: handleMenuEnter,
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
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);

  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [lockedTitle, setLockedTitle] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const closeTimeout = React.useRef<any>(null);

  const checkActive = useCallback((navItem: any): boolean => {
    if (navItem.href && pathname === navItem.href) return true;
    if (navItem.children) {
      return navItem.children.some((child: any) => checkActive(child));
    }
    return false;
  }, [pathname]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>, title: string) => {
    if (lockedTitle) return; 
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setAnchorEl(event.currentTarget);
    setActiveTitle(title);
  };

  const handleClose = () => {
    if (!lockedTitle) {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
      closeTimeout.current = setTimeout(() => {
        setAnchorEl(null);
        setActiveTitle(null);
      }, 100); // 100ms grace period
    }
  };

  const handleMenuEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  };

  const handleToggleLock = (event: React.MouseEvent<HTMLElement>, title: string) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
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

      </Stack>
    </Box>
  );
};

export default SkylineNavbar;
