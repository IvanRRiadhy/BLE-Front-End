import React from 'react';
import {
  Box,
  Avatar,
  ListItemButton,
  Typography,
  Stack,
  Divider,
  IconButton,
  useTheme,
} from '@mui/material';
import { MoreVertRounded } from '@mui/icons-material';
import { IconBell, IconLiveView } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from 'src/utils/axios';
import { useSelector } from 'src/store/Store';

type ListType = {
  id: string;
  target: string;
  image: string;
  floor: string;
  area: string;
  time: string;
  status?: string;
  type?: 'Alarm' | 'Tracking';
  personId?: string;
  dmac?: string;
};

type Props = {
  item?: ListType;
  onItemClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const SidebarListItem = ({ item, onItemClick }: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const customizer = useSelector((state) => state.customizer);
  const br = `${customizer.borderRadius}px`;

  const isAlarm = item?.type === 'Alarm';

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <ListItemButton
      onClick={onItemClick}
      sx={{
        mb: 2,
        borderRadius: br,
        border: `1px solid ${theme.palette.divider}`,
        p: 2,
        flexDirection: 'column',
        alignItems: 'stretch',
        backgroundColor: isAlarm
          ? theme.palette.error.light
          : theme.palette.secondary.light,
        '&:hover': {
          backgroundColor: isAlarm
            ? theme.palette.error.main
            : theme.palette.secondary.main,
        },
      }}
    >
      {/* ================= HEADER ================= */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          {isAlarm ? <IconBell size={18} /> : <IconLiveView size={18} />}
          <Typography fontWeight={700}>
            {isAlarm ? 'Alarm Event' : 'Tracking Event'}
          </Typography>
        </Stack>

        <IconButton size="small">
          <MoreVertRounded />
        </IconButton>
      </Box>

      <Box
        mt={0.5}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="body2" fontWeight={500}>
          {item?.area} - {item?.floor}
        </Typography>

        <Typography variant="body2">
          {formatTime(item?.time ?? '')}
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* ================= BODY ================= */}
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          src={item?.image ? `${BASE_URL}${item.image}` : undefined}
          alt={item?.target}
        />

        <Box flex={1}>
          <Typography fontWeight={700}>{item?.target}</Typography>
          <Typography variant="body2">
            Card Number: {item?.personId ?? '-'}
          </Typography>
          <Typography variant="body2">
            DMAC: {item?.dmac ?? '-'}
          </Typography>
        </Box>

        {/* Alarm Status */}
        {isAlarm && item?.status && (
          <Box
            sx={{
              backgroundColor: theme.palette.error.dark,
              color: '#fff',
              px: 2,
              py: 0.5,
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: theme.shadows[2],
            }}
          >
            {item.status}
          </Box>
        )}
      </Box>
    </ListItemButton>
  );
};

export default SidebarListItem;
