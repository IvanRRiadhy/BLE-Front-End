import React from 'react';

import { useSelector } from 'src/store/Store';
import {
  ListItemText,
  Box,
  Avatar,
  ListItemButton,
  Typography,
  Stack,
  ListItemAvatar,
  useTheme,
  Checkbox,
} from '@mui/material';
import { MoreVertRounded } from '@mui/icons-material';
import { IconLiveView, IconBell } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type ListType = {
  id: string;
  device: string;
  target: string;
  floor: string;
  area: string;
  alarmType?: string;
  time: string;
  status?: string;
  type?: string;
};

type Props = {
  onItemClick: (event: React.MouseEvent<HTMLElement>) => void;
  item?: ListType;
};

const SidebarListItem = ({ item, onItemClick }: Props) => {
  const { t } = useTranslation();
  const customizer = useSelector((state) => state.customizer);
  const br = `${customizer.borderRadius}px`;

  const theme = useTheme();

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };

  return (
    <ListItemButton
      sx={{
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderRadius: br,
        border: `1px solid ${theme.palette.divider}`,
        padding: 2,
        backgroundColor:
          item?.type === 'Alarm'
            ? theme.palette.error.light // Background for "Alarm"
            : theme.palette.secondary.light, // Background for "Tracking"
        '&:hover': {
          backgroundColor:
            item?.type === 'Alarm'
              ? theme.palette.error.main // Hover effect for "Alarm"
              : theme.palette.secondary.main, // Hover effect for "Tracking"
        },
      }}
      onClick={onItemClick}
    >
      {/* Top Section: Icon and Details */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        {/* Left Section: Icon */}
        <ListItemAvatar>
          <Avatar alt="Item Icon">
            {item?.type === 'Alarm' ? <IconBell /> : <IconLiveView />}
          </Avatar>
        </ListItemAvatar>

        {/* Middle Section: Device, Time, and Floor */}
        <ListItemText>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" fontWeight="bold">
              {item?.device}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatTime(item?.time ?? '')} {/* Format the time */}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item?.floor}
            </Typography>
          </Stack>
        </ListItemText>

        {/* Right Section: Three Dots Icon */}
        <Box>
          <MoreVertRounded />
        </Box>
      </Box>

      {/* Bottom Section: Status Box for Alarm */}
      {item?.type === 'Alarm' && item?.status && (
        <Box
          sx={{
            marginTop: 1, // Add spacing above the status box
            textAlign: 'center', // Center the text inside the box
            backgroundColor: theme.palette.error.dark,
            color: theme.palette.common.white,
            padding: '4px 8px', // Adjust padding for a compact size
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            boxShadow: theme.shadows[2],
            display: 'inline-block', // Ensure the box wraps tightly around the text
            alignSelf: 'center',
          }}
        >
          {item.status}
        </Box>
      )}
    </ListItemButton>
  );
};

export default SidebarListItem;
