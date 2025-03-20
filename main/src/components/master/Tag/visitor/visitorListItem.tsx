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
} from '@mui/material';
import { visitorType } from 'src/store/apps/crud/visitor';

type Props = {
  onTagClick: (event: React.MouseEvent<HTMLElement>) => void;
  visitor?: visitorType;
  active: any;
};

const VisitorListItem = ({ onTagClick, visitor, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const br = `${customizer.borderRadius}px`;

  const theme = useTheme();

  const warningColor = theme.palette.warning.main;

  return (
    <ListItemButton sx={{ mb: 1 }} selected={active}>
      <ListItemAvatar>
        <Avatar alt="User Profile" src={visitor?.faceImage} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center" onClick={onTagClick}>
          <Box mr="auto">
            <Typography variant="subtitle1" noWrap fontWeight={600} sx={{ maxWidth: '200px' }}>
              {visitor?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {visitor?.bleCardNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {visitor?.personId}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};

export default VisitorListItem;
