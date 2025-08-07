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
import { IconMail, IconCircleX } from '@tabler/icons-react';
import {
  gender,
  genderIconMap,
  visitorStatus,
  visitorStatusEnumMap,
  visitorStatusIconMap,
} from 'src/types/crud/input';
import AddEditVisitor from '../../CRUD/visitor/AddEditVisitor';
import { SetVisibilityFilter } from 'src/store/apps/crud/visitor';
import VisitorRegister from './visitorregister/visitorRegister';
import { UpdateFilter } from 'src/store/apps/crud/trxVisitor';
import InvitePage from 'src/components/my-visit/Invite/InviteForm';

interface DataType {
  id: string | number;
  name?: string;
  filter?: string;
  icon?: any;
  filterbyTitle?: string;
  divider?: boolean;
  color?: string;
  category?: string;
}

const VisitorFilter = () => {
  const active = true;
  const dispatch = useDispatch();
  const customizer = useSelector((state: any) => state.customizer);
  const br = `${customizer.borderRadius}px`;
  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter.filters,
  );

  const genderFilters: DataType[] = gender
    .filter((gender) => !gender.disabled) // Filter out disabled entries
    .map((gender) => ({
      id: gender.value,
      name: gender.label,
      filter: gender.value,
      category: 'gender',
      icon: genderIconMap[gender.value] || IconCircleX,
    }));

  const statusFilters: DataType[] = visitorStatus
    .filter((status) => !status.disabled)
    .map((status) => ({
      id: status.value,
      name: status.label,
      filter: status.value,
      category: 'status',
      icon: visitorStatusIconMap[status.value] || IconCircleX,
    }));

  const filterData: DataType[] = [
    {
      id: 1,
      name: 'All',
      filter: 'show_all',
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

  const handleFilter = (filter: string, category?: string) => {
    const currentFilters = { ...trxVisitorFilter };

    switch (category) {
      case 'gender': {
        console.log('Gender Filter : ', filter);
        break;
      }
      case 'status': {
        const mappedValue = visitorStatusEnumMap[filter];
        if (mappedValue === undefined) return;

        const currentValue = currentFilters.Status;

        const newValue = currentValue === mappedValue ? undefined : mappedValue;

        dispatch(UpdateFilter({ filters: { ...currentFilters, Status: newValue } }));
        break;
      }
      default:
        dispatch(UpdateFilter({ filters: {} }));
        break;
    }
  };

  return (
    <>
      <Box p={2}>
        <InvitePage />
      </Box>

      <List>
        <Box
          sx={{
            height: { lg: 'calc(100vh - 230px)', md: '100vh' },
            maxHeight: '800px',
            overflow: 'auto',
          }}
        >
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
                sx={{
                  mb: 1,
                  mx: 3,
                  borderRadius: br,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main', // or any color
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
                selected={
                  filter.category === 'status' &&
                  trxVisitorFilter.Status === visitorStatusEnumMap[filter.filter!]
                }
                onClick={() => handleFilter(`${filter.filter}`, filter.category)}
                key={filter.id}
              >
                <ListItemIcon sx={{ minWidth: '30px', color: filter.color }}>
                  <filter.icon stroke="1.5" size={19} />
                </ListItemIcon>
                <ListItemText primary={filter.name} />
              </ListItemButton>
            );
          })}
        </Box>
      </List>
    </>
  );
};

export default VisitorFilter;
