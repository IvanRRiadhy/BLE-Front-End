import React, { useEffect } from 'react';
import { BASE_URL } from 'src/utils/axios';
import { useSelector } from 'src/store/Store';
import {
  ListItemText,
  Box,
  Avatar,
  ListItemButton,
  Typography,
  Stack,
  ListItemAvatar,
  // useTheme,
  Checkbox,
} from '@mui/material';
import { PatrolAssignType } from 'src/store/apps/crud/patrolRoute';

type Props = {
  onAssignmentClick: (event: React.MouseEvent<HTMLElement>) => void;
  assignment?: PatrolAssignType;
  active?: PatrolAssignType | null;
};

const PatrolAssignmentListItem = ({ onAssignmentClick, assignment, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const br = `${customizer.borderRadius}px`;

  return (
    <ListItemButton sx={{ mb: 1 }} selected={active?.id === assignment?.id} onClick={onAssignmentClick}>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography
              variant="subtitle1"
              noWrap
              fontWeight={600}
              sx={{ maxWidth: '200px' }}
              textOverflow={'ellipsis'}
            >
              {assignment?.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: '200px' }}
              textOverflow={'ellipsis'}
              noWrap
            >
              {assignment?.description}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};

export default PatrolAssignmentListItem;
