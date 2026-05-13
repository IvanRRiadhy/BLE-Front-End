import React from 'react';
import {
  ListItemText,
  Box,
  Avatar,
  ListItemButton,
  Typography,
  Stack,
  ListItemAvatar,
  IconButton,
} from '@mui/material';

import { IconTrash, IconPencil } from '@tabler/icons-react';
import Area5 from 'src/assets/images/svgs/area/5.svg';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';
import { RootState, useSelector } from 'src/store/Store';

type Props = {
  onListClick: (event: React.MouseEvent<HTMLElement>) => void;
  onEditClick: (event: React.MouseEvent<HTMLElement>) => void;
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void;
  patrolArea?: PatrolAreaType;
  active: any;
};

const PatrolAreaListItem = ({ onListClick, onEditClick, onDeleteClick, patrolArea, active }: Props) => {
  const isEditing = useSelector((state: RootState) => state.PatrolAreaReducer.editingPatrolArea);
  return (
    <ListItemButton
      id={`patrol-area-item-${patrolArea?.id}`}
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
        <Avatar alt={patrolArea?.name || 'Area'} src={Area5} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                maxWidth: '150px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {patrolArea?.name}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
      {active && !isEditing && (
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

export default PatrolAreaListItem;
