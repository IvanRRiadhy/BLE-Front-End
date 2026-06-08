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
  visitor: VisitorType;
};
const getOrganizationDisplay = (organization?: string, department?: string, district?: string) => {
  return [organization, department, district].filter((v) => v && v.trim() !== '').join(' - ');
};

const VisitorListItem = ({ onTagClick, visitor }: Props) => {
  return (
    <ListItemButton sx={{ mb: 1 }} onClick={onTagClick}>
      <ListItemAvatar>
        <Avatar alt="Visitor Face" src={`${BASE_URL}${visitor?.faceImage}`} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography variant="subtitle1" noWrap fontWeight={600} sx={{ maxWidth: '200px' }}>
              {visitor.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {visitor.personId}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {getOrganizationDisplay(
                visitor.organizationName,
                visitor.departmentName,
                visitor.districtName,
              )}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};

export default VisitorListItem;
