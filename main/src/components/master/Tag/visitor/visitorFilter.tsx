import React, { useEffect } from 'react';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  ListItemText,
  ListItemButton,
  List,
  Divider,
  ListItemIcon,
  Typography,
  Box,
} from '@mui/material';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { IconMail, IconSend, IconBucket, IconFolder, IconFold, IconGenderMale, IconGenderFemale } from '@tabler/icons-react';
import { gender, visitorStatus } from 'src/types/crud/input';
import AddEditVisitor from '../../CRUD/visitor/AddEditVisitor';
import { SetVisibilityFilter } from 'src/store/apps/crud/visitor';

interface DataType {
  id: string | number;
  name?: string;
  sort?: string;
  icon?: any;
  filterbyTitle?: string;
  divider?: boolean;
  color?: string;
}

const VisitorFilter = () => {
  const active = true;
  const dispatch = useDispatch();
  const customizer = useSelector((state: any) => state.customizer);
  const br = `${customizer.borderRadius}px`;

  const genderFilters: DataType[] = gender
    .filter((gender) => !gender.disabled) // Filter out disabled entries
    .map((gender) => ({
      id: gender.value,
      name: gender.label,
      sort: gender.value,
      icon: IconFolder,
    }));

  const statusFilters: DataType[] = visitorStatus
    .filter((status) => !status.disabled)
    .map((status) => ({
      id: status.value,
      name: status.label,
      sort: status.value,
      icon: IconFolder,
    }));

  const filterData: DataType[] = [
    {
      id: 1,
      name: 'All',
      sort: 'show_all',
      icon: IconMail,
      color: 'primary.main',
    },
    {
      id: 2,
      divider: true,
    },
    {
      id: 3,
      filterbyTitle: 'Gender',
    },
    ...genderFilters,
    {
      id: 4,
      divider: true,
    },
    {
      id: 5,
      filterbyTitle: 'Status',
    },
    ...statusFilters,
  ];
  return (
    <>
      <Box p={2}>
        <AddEditVisitor type="add" />
      </Box>

      <List>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh' }, maxHeight: '800px' }}>
          {filterData.map((filter) => {
            if (filter.filterbyTitle) {
              return (
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  pl={5.1}
                  mt={1}
                  pb={2}
                  key={filter.id} // ✅ Add key here
                >
                  {filter.filterbyTitle}
                </Typography>
              );
            } else if (filter.divider) {
              return <Divider key={filter.id} sx={{ mb: 3 }} />; // ✅ Add key here
            }

            return (
              <ListItemButton
                sx={{ mb: 1, mx: 3, borderRadius: br }}
                selected={active}
                onClick={() => dispatch(SetVisibilityFilter(`${filter.sort}`))}
                key={filter.id} // ✅ Add key here
              >
                <ListItemIcon sx={{ minWidth: '30px', color: filter.color }}>
                  <filter.icon stroke="1.5" size={19} />
                </ListItemIcon>
                <ListItemText primary={filter.name} />
              </ListItemButton>
            );
          })}
        </Scrollbar>
      </List>
    </>
  );
};

export default VisitorFilter;
