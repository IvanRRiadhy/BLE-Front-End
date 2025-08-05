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
  // useTheme,
} from '@mui/material';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { TrxVisitorType } from 'src/store/apps/crud/trxVisitor';

type Props = {
  onTagClick: (event: React.MouseEvent<HTMLElement>) => void;
  trx?: TrxVisitorType;
  active: any;
};


const VisitorListItem = ({ onTagClick, trx, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const br = `${customizer.borderRadius}px`;

  // const theme = useTheme();

  return (
    <ListItemButton sx={{ mb: 1 }} selected={active} onClick={onTagClick}>
      <ListItemAvatar>
        <Avatar alt="Visitor Face" src={`${BASE_URL}${trx?.visitor?.faceImage}`} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
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
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};

export default VisitorListItem;
