import React from 'react';

// import { useSelector } from 'src/store/Store';
import {
  ListItemText,
  Box,
  Avatar,
  ListItemButton,
  Typography,
  Stack,
  ListItemAvatar,
  // useTheme,
  IconButton,
} from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  selected: boolean;
  onHideClick: (event: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: any;
  show: boolean;
};

const FloorplanOverviewSidebarItem = ({
  onClick,
  selected,
  onHideClick,
  title,
  subtitle,
  icon,
  show,
}: Props) => {
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // Call the onHideClick function with the boolean value
    onHideClick && onHideClick(!show);
  };
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        px: 2,
        py: 1,
        mx: 1,
        mb: 0.5,
        borderRadius: 1,
        opacity: show ? 1 : 0.4,
        transition: 'all 0.2s',

        '&:hover': {
          backgroundColor: 'action.hover',
        },

        '&.Mui-selected': {
          backgroundColor: 'primary.lighter',
        },
      }}
    >
      <ListItemText
        primary={
          <Typography variant="body2" fontWeight={500} noWrap>
            {title}
          </Typography>
        }
      />

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onHideClick(!show);
        }}
      >
        {show ? <IconEye size={18} /> : <IconEyeOff size={18} />}
      </IconButton>
    </ListItemButton>
  );
};

export default FloorplanOverviewSidebarItem;
