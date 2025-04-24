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
} from '@mui/material';

import { memberType } from 'src/store/apps/crud/member';

type Props = {
  onTagClick: (event: React.MouseEvent<HTMLElement>) => void;
  member?: memberType;
  manySelect?: boolean;
  setManySelectMembers?: (members: memberType[]) => void; // Improved typing
  manySelectMembers?: memberType[]; // Track selected members
  active: any;
};

const TagListItem = ({
  onTagClick,
  member,
  manySelect,
  setManySelectMembers,
  manySelectMembers = [], // Default empty array for safety
  active,
}: Props) => {
  const customizer = useSelector((state) => state.customizer);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const br = `${customizer.borderRadius}px`;

  const theme = useTheme();

  const warningColor = theme.palette.warning.main;
  const isChecked = manySelectMembers.some((m) => m.id === member?.id);

  const handleCheckboxChange = () => {
    if (!setManySelectMembers || !member) return;

    if (isChecked) {
      setManySelectMembers(manySelectMembers.filter((m) => m.id !== member.id));
    } else {
      setManySelectMembers([...manySelectMembers, member]);
    }
  };

  return (
    <ListItemButton sx={{ mb: 1 }} selected={active} onClick={onTagClick}>
      <ListItemAvatar>
        <Avatar alt="User Profile" src={member?.faceImage} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography variant="subtitle1" noWrap fontWeight={600} sx={{ maxWidth: '200px' }}>
              {member?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {member?.bleCardNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {member?.personId}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
      {/* Checkbox for Multi-Select */}
      {manySelect && <Checkbox edge="end" checked={isChecked} onChange={handleCheckboxChange} />}
    </ListItemButton>
  );
};

export default TagListItem;
