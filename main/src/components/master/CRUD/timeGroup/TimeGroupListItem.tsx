import React from 'react';
import {
  Box,
  ListItemButton,
  Typography,
  Stack,
  Checkbox,
} from '@mui/material';
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';

type Props = {
  onTimeGroupClick: (event: React.MouseEvent<HTMLElement>) => void;
  timeGroup?: TimeGroupType;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  active: boolean;
};

const TimeGroupListItem = ({
  onTimeGroupClick,
  timeGroup,
  isSelected = false,
  onToggleSelect,
  active,
}: Props) => {
  return (
    <ListItemButton
      sx={{ mb: 0.5, px: 1.5, py: 1 }}
      selected={active}
      onClick={onTimeGroupClick}
    >
      <Stack direction="row" gap={1} alignItems="center" width="100%">
        {timeGroup && onToggleSelect && (
          <Checkbox
            size="small"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(timeGroup.id);
            }}
            sx={{ p: 0.5 }}
          />
        )}
        <Box mr="auto" sx={{ overflow: 'hidden' }}>
          <Typography
            variant="subtitle1"
            noWrap
            fontWeight={600}
            sx={{ maxWidth: '160px' }}
            textOverflow="ellipsis"
          >
            {timeGroup?.name}
          </Typography>
          {timeGroup?.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: '160px' }}
              textOverflow="ellipsis"
              noWrap
            >
              {timeGroup.description}
            </Typography>
          )}
        </Box>
      </Stack>
    </ListItemButton>
  );
};

export default TimeGroupListItem;

