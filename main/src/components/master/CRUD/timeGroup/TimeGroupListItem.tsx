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
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';

type Props = {
  onTimeGroupClick: (event: React.MouseEvent<HTMLElement>) => void;
  timeGroup?: TimeGroupType;
  manySelect?: boolean;
  setManySelectTimeGroups?: (TimeGroup: TimeGroupType[]) => void; // Improved typing
  manySelectTimeGroups?: TimeGroupType[]; // Track selected time group
  active: any;
};

const TimeGroupListItem = ({
  onTimeGroupClick,
  timeGroup,
  manySelect,
  setManySelectTimeGroups,
  manySelectTimeGroups = [],
  active,
}: Props) => {
  const customizer = useSelector((state) => state.customizer);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const br = `${customizer.borderRadius}px`;

  // const theme = useTheme();

  const isChecked = manySelectTimeGroups.some((time) => time.id === timeGroup?.id);
    useEffect(() => {
        console.log(timeGroup);
    },[timeGroup]);
  const handleCheckboxChange = () => {
    if (!setManySelectTimeGroups || !timeGroup) return;

    if (isChecked) {
      setManySelectTimeGroups(manySelectTimeGroups.filter((m) => m.id !== timeGroup.id));
    } else {
      setManySelectTimeGroups([...manySelectTimeGroups, timeGroup]);
    }
  };

  return (
    <ListItemButton sx={{ mb: 1 }} selected={active} onClick={onTimeGroupClick}>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography variant="subtitle1" noWrap fontWeight={600} sx={{ maxWidth: '200px' }}>
              {timeGroup?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '200px' }} textOverflow={'ellipsis'} noWrap>
              {timeGroup?.description}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};

export default TimeGroupListItem;