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
  IconButton,
} from '@mui/material';

import { IconTrash, IconPencil } from '@tabler/icons-react';
import AccessDoor from 'src/assets/images/masters/Devices/AccessDoor.png';
import Area1 from 'src/assets/images/svgs/area/1.svg';
import Area2 from 'src/assets/images/svgs/area/2.svg';
import Area3 from 'src/assets/images/svgs/area/3.svg';
import Area4 from 'src/assets/images/svgs/area/4.svg';
import Area5 from 'src/assets/images/svgs/area/5.svg';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';

type Props = {
  onListClick: (event: React.MouseEvent<HTMLElement>) => void;
  onEditClick: (event: React.MouseEvent<HTMLElement>) => void;
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void;
  area?: MaskedAreaType;
  active: any;
};

const AreaListItem = ({ onListClick, onEditClick, onDeleteClick, area, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);

  return (
    <ListItemButton
      sx={{ mb: 1 }}
      selected={active}
      onClick={(event) => {
        // Prevent triggering onClick if the event originated from a child element
        if (event.target instanceof HTMLElement && event.target.closest('.interactive')) {
          return;
        }
        onListClick(event);
      }}
    >
      <ListItemAvatar>
        <Avatar alt={area?.name || 'Area'} src={Area5} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography variant="subtitle1" fontWeight={600} sx={{ maxWidth: '150px' }}>
              {area?.name}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
      {active && (
        <>
          <IconButton
            className="interactive"
            color="error"
            size="small"
            onClick={(event) => {
              event.stopPropagation(); // Prevent triggering onListClick
              onDeleteClick(event);
            }}
          >
            <IconTrash size={16} />
          </IconButton>
          <IconButton
            className="interactive"
            color="primary"
            size="small"
            onClick={(event) => {
              event.stopPropagation(); // Prevent triggering onListClick
              onEditClick(event);
            }}
          >
            <IconPencil size={16} />
          </IconButton>
        </>
      )}
    </ListItemButton>
  );
};

export default AreaListItem;
