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
import { IntruderType } from 'src/store/apps/crud/alarmTrigger';
import { visitorStatusEnumMap } from 'src/types/crud/input';

type Props = {
  onTagClick: (event: React.MouseEvent<HTMLElement>) => void;
  intruder?: IntruderType;
  active: any;
};

type ChipColorMap = {
  Visitor: 'primary';
  Member: 'success';
  // Add any other possible keys here
};

const IntruderListItem = ({ onTagClick, intruder, active }: Props) => {
  const settings = useSelector((state) => state.settings);
  const br = `${settings.borderRadius}px`;
  const truncateText = (text?: string, maxLength = 12) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };
  const chipColor: ChipColorMap = {
    Visitor: 'primary',
    Member: 'success',
    // Add any other possible values here
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
        <Avatar alt="Visitor Face" src={`${BASE_URL}${intruder?.personImage}`} />
      </ListItemAvatar>

      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box mr="auto" sx={{ minWidth: 0 }}>
              {' '}
              {/* ensures flex shrink */}
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={intruder?.personName}
              >
                {truncateText(intruder?.personName, 20)}
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
                title={intruder?.cardNumber}
              >
                {truncateText(intruder?.cardNumber, 16)}
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
                title={intruder?.beaconId}
              >
                {truncateText(intruder?.beaconId, 20)}
              </Typography>
            </Box>

            {intruder?.personType && (
              <Chip
                label={intruder.personType}
                size="small"
                color={chipColor[intruder.personType as keyof typeof chipColor]}
              />
            )}
          </Stack>
        }
      />
    </ListItemButton>
  );
};

export default IntruderListItem;
