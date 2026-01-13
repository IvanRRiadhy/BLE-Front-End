// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router';

// mui imports
import { ListItemIcon, styled, ListItemText, Box, ListItemButton } from '@mui/material';
import { useSelector } from 'src/store/Store';

// custom imports
import NavItem from '../NavItem/NavItem';

// plugins
import { IconChevronDown } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';

type NavGroupProps = {
  [x: string]: any;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
};

interface NavCollapseProps {
  menu: NavGroupProps;
  level: number;
  pathWithoutLastPart: any;
  pathDirect: any;
  hideMenu: any;
  lockedMenuId: string | null;
  setLockedMenuId: (id: string | null) => void;
  parentHref?: string;
}

// FC Component For Dropdown Menu
const NavCollapse = ({
  menu,
  level,
  pathWithoutLastPart,
  pathDirect,
  hideMenu,
  lockedMenuId,
  setLockedMenuId,
  parentHref,
}: NavCollapseProps) => {
  const Icon = menu.icon;
  const theme = useTheme();
  const rootRef = useRef<HTMLLIElement | null>(null);

  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);
  const customizer = useSelector((state: RootState) => state.customizer);
  const menuIcon =
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.1rem" />;
  const [lockedOpen, setLockedOpen] = useState(false);
  const menuKey = menu.href;
  const selfHref = menu.href ?? parentHref ?? '';

  const isLocked = lockedMenuId !== null && selfHref.startsWith(lockedMenuId);

  const isAnotherLocked = lockedMenuId !== null && !selfHref.startsWith(lockedMenuId);

  useEffect(() => {
    setOpen(false);
    menu.children.forEach((item: any) => {
      if (item.href === pathname) {
        setOpen(true);
      }
    });
  }, [pathname, menu.children]);

  useEffect(() => {
    if (!lockedMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setLockedMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [lockedMenuId, setLockedMenuId]);

  const ListItemStyled = styled(ListItemButton)(() => ({
    width: 'auto',
    padding: '5px 10px',
    position: 'relative',
    flexGrow: 'unset',
    gap: '10px',
    borderRadius: `${customizer.borderRadius}px`,
    whiteSpace: 'nowrap',
    color:
      open || pathname.includes(menu.href) || level < 1 ? 'white' : theme.palette.text.secondary,
    backgroundColor: open || pathname.includes(menu.href) ? theme.palette.primary.main : '',

    // Hover only works when nothing else is locked
    '&:hover': {
      backgroundColor:
        open || pathname.includes(menu.href)
          ? theme.palette.primary.main
          : theme.palette.primary.light,
    },

    // Hover OR locked → show submenu
    '&:hover > .SubNav, &.locked-open > .SubNav': {
      display: isAnotherLocked && !isLocked ? 'none' : 'grid',
      gridAutoFlow: 'row',
      gap: '1em',
    },
  }));

  const ListSubMenu = styled((props: any) => <Box {...props} />)(() => ({
    display: 'none',
    position: 'absolute',
    top: level > 1 ? `0px` : '100%',
    left: level > 1 ? `100%` : '0px',
    padding: '10px',
    maxHeight: '75em',
    listStyle: 'none',
    paddingLeft: 0,
    margin: 0,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[8],
    backgroundColor: theme.palette.background.paper,
    minWidth: '180px',
    zIndex: 10,
  }));

  const listItemProps: {
    component: string;
  } = {
    component: 'li',
  };

  // If Menu has Children
  const submenus = menu.children?.map((item: any) => {
    if (item.children) {
      return (
        <NavCollapse
          key={item.title}
          menu={item}
          level={level + 1}
          pathWithoutLastPart={pathWithoutLastPart}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          lockedMenuId={lockedMenuId}
          setLockedMenuId={setLockedMenuId}
          parentHref={selfHref}
        />
      );
    } else {
      return (
        <NavItem
          key={item.id}
          item={item}
          level={level + 1}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={function (): void {}}
        />
      );
    }
  });

  return (
    <li ref={rootRef}>
      <ListItemStyled
        {...listItemProps}
        selected={pathWithoutLastPart === menu.href}
        className={isLocked && !parentHref ? 'locked-open' : ''}
        onClick={(e) => {
          e.preventDefault();
          const lockKey = menu.href ?? parentHref ?? null;
          setLockedMenuId(isLocked ? null : lockKey);
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 'auto',
            p: '3px 0',
            color: 'inherit',
          }}
        >
          {menuIcon}
        </ListItemIcon>
        <ListItemText color="inherit" sx={{ mr: 'auto' }}>
          {menu.title}
        </ListItemText>
        <IconChevronDown size="1rem" />
        <ListSubMenu component={'ul'} className="SubNav">
          {submenus}
        </ListSubMenu>
      </ListItemStyled>
    </li>
  );
};

export default NavCollapse;
