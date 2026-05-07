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
  Checkbox,
  Chip,
} from '@mui/material';
import { memberType } from 'src/store/apps/crud/member';
import { RootState } from 'src/store/Store';

type Props = {
  onSecurityGuardClick: (event: React.MouseEvent<HTMLElement>) => void;
  member: memberType; // make required for clarity
  manySelect?: boolean;
  setManySelectSecurityGuards?: (members: memberType[]) => void;
  manySelectSecurityGuards?: memberType[];
  active: boolean;
};

const SecurityGuardListItem: React.FC<Props> = ({
  onSecurityGuardClick,
  member,
  manySelect = false,
  setManySelectSecurityGuards,
  manySelectSecurityGuards = [],
  active,
}) => {
  const settings = useSelector((state: RootState) => state.settings);
  const borderRadius = `${settings.borderRadius}px`;

  // Determine if this member is selected in multi-select mode
  const isChecked = manySelectSecurityGuards.some((m) => m.id === member.id);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // prevent triggering onSecurityGuardClick
    if (!setManySelectSecurityGuards) return;

    if (isChecked) {
      setManySelectSecurityGuards(manySelectSecurityGuards.filter((m) => m.id !== member.id));
    } else {
      setManySelectSecurityGuards([...manySelectSecurityGuards, member]);
    }
  };

  return (
    <ListItemButton
      sx={{
        mb: 1,
        borderRadius,
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
        },
      }}
      selected={active}
      onClick={onSecurityGuardClick}
    >
      <ListItemAvatar>
        <Avatar
          alt={member.name || 'Member Face'}
          src={member.faceImage ? `${BASE_URL}${member.faceImage}` : undefined}
        />
      </ListItemAvatar>

      <ListItemText
        disableTypography
        primary={
          <Typography
            variant="subtitle1"
            component="div"
            noWrap
            fontWeight={600}
            sx={{ maxWidth: '200px' }}
          >
            {member.name || 'Unnamed Member'}
          </Typography>
        }
        secondary={
          <>
            <Typography variant="body2" component="div" color="text.secondary" noWrap>
              {member.bleCardNumber || '-'}
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary" noWrap>
              {member.personId || '-'}
            </Typography>
          </>
        }
      />

      <Stack direction="row" spacing={1} alignItems="center">
        {member.isBlacklist && (
          <Chip
            label="Blacklisted"
            color="error"
            size="small"
            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
          />
        )}
        {manySelect && <Checkbox edge="end" checked={isChecked} onChange={handleCheckboxChange} />}
      </Stack>
    </ListItemButton>
  );
};

export default SecurityGuardListItem;
