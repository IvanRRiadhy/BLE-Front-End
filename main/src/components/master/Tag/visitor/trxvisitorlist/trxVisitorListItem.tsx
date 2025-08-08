import React from 'react';
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
  Chip
} from '@mui/material';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { TrxVisitorType } from 'src/store/apps/crud/trxVisitor';
import { visitorStatusEnumMap } from 'src/types/crud/input';

type Props = {
  onTagClick: (event: React.MouseEvent<HTMLElement>) => void;
  trx?: TrxVisitorType;
  active: any;
};

// Map enum value to MUI Chip color
const visitorStatusColorMap: Record<number, any> = {
  0: 'default',   // grey
  1: 'success',   // green
  2: 'default',   // blue
  3: 'warning',   // yellow
  4: 'error',     // red
  5: 'default',   // grey
  6: 'secondary', // purple
  7: 'primary',      // light blue
};

const TrxVisitorListItem = ({ onTagClick, trx, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const br = `${customizer.borderRadius}px`;
  const statusValue = trx?.status ? visitorStatusEnumMap[trx.status] : undefined;
  const chipColor = statusValue !== undefined ? visitorStatusColorMap[statusValue] : 'default';

  return (
    <ListItemButton sx={{ mb: 1 }} selected={active} onClick={onTagClick}>
      <ListItemAvatar>
        <Avatar alt="Visitor Face" src={`${BASE_URL}${trx?.visitor?.faceImage}`} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          {/* Left info */}
          <Box mr="auto">
            <Typography variant="subtitle1" noWrap fontWeight={600} sx={{ maxWidth: '200px' }}>
              {trx?.visitor?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {trx?.visitor?.bleCardNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {trx?.visitor?.personId}
            </Typography>
          </Box>

          {/* Status chip */}
          {trx?.status && (
            <Chip
              label={trx.status}
              size="small"
              color={chipColor}
            />
          )}
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};

export default TrxVisitorListItem;
