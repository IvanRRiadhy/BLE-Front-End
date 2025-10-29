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
  Chip,
} from '@mui/material';
import { TrxVisitorType } from 'src/store/apps/crud/trxVisitor';
import { visitorStatusEnumMap } from 'src/types/crud/input';

type Props = {
  onTagClick: (event: React.MouseEvent<HTMLElement>) => void;
  trx?: TrxVisitorType;
  active: any;
};

// Map enum value to MUI Chip color
const visitorStatusColorMap: Record<number, any> = {
  0: 'default',   // Waiting
  1: 'success',   // Checkin
  2: 'default',   // Checkout
  3: 'warning',   // Deny
  4: 'error',     // Block
  5: 'success',   // Unblock
  6: 'primary',   // Precheckin
  7: 'secondary', // Preregist
};

const TrxVisitorListItem = ({ onTagClick, trx, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);
  const br = `${customizer.borderRadius}px`;

  const statusValue = trx?.status ? visitorStatusEnumMap[trx.status] : undefined;
  const chipColor = statusValue !== undefined ? visitorStatusColorMap[statusValue] : 'default';

  // helper to truncate manually if needed (for safety)
  const truncateText = (text?: string, maxLength = 12) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return (
    <ListItemButton
      sx={{
        mb: 1,
        borderRadius: br,
        '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
      }}
      selected={active}
      onClick={onTagClick}
    >
      <ListItemAvatar>
        <Avatar
          alt="Visitor Face"
          src={`${BASE_URL}${trx?.visitor?.faceImage}`}
        />
      </ListItemAvatar>

      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box mr="auto" sx={{ minWidth: 0 }}> {/* ensures flex shrink */}
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={trx?.visitor?.name}
              >
                {truncateText(trx?.visitor?.name, 20)}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={trx?.visitor?.bleCardNumber}
              >
                {truncateText(trx?.visitor?.bleCardNumber, 16)}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={trx?.visitor?.personId}
              >
                {truncateText(trx?.visitor?.personId, 20)}
              </Typography>
            </Box>

            {trx?.status && (
              <Chip label={trx.status} size="small" color={chipColor} />
            )}
          </Stack>
        }
      />
    </ListItemButton>
  );
};

export default TrxVisitorListItem;
