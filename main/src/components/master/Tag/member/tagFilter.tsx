import { useEffect } from 'react';
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
import { IconMail, IconFolder, IconClearAll } from '@tabler/icons-react';
import { SetVisibilityFilter } from 'src/store/apps/crud/member';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import AddEditMember from '../../CRUD/member/AddEditMember';
import { DistrictType, fetchDistricts } from 'src/store/apps/crud/district';
import { UpdateFilter } from 'src/store/apps/crud/member';
import member from 'src/views/master/crud/Member';

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

const TagFilter = () => {
  const active = true;
  const dispatch = useDispatch();
  const customizer = useSelector((state: any) => state.customizer);
  const br = `${customizer.borderRadius}px`;
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter.filters);

  useEffect(() => {
    dispatch(fetchDepartments());
    dispatch(fetchDistricts());
    dispatch(fetchOrganizations());
  }, [dispatch]);

  const departmentFilters: DataType[] = departmentData.map((dept: DepartmentType) => ({
    id: dept.id,
    name: dept.name,
    filter: dept.id,
    category: 'department',
    icon: IconFolder,
  }));

  const districtFilters: DataType[] = districtData.map((dist: DistrictType) => ({
    id: dist.id,
    name: dist.name,
    filter: dist.id,
    category: 'district',
    icon: IconFolder,
  }));

  const organizationFilters: DataType[] = organizationData.map((orgz: OrganizationType) => ({
    id: orgz.id,
    name: orgz.name,
    filter: orgz.id,
    category: 'organization',
    icon: IconFolder,
  }));

  const filterData: DataType[] = [
    {
      id: 1,
      name: 'All',
      filter: 'show_all',
      icon: IconClearAll,
      category: 'all',
    },
    {
      id: 2,
      divider: true,
    },
    {
      id: 3,
      filterbyTitle: 'Department',
    },
    ...departmentFilters, // Inject dynamic department data here
    {
      id: 4,
      divider: true,
    },
    {
      id: 5,
      filterbyTitle: 'District',
    },
    ...districtFilters,
    {
      id: 6,
      divider: true,
    },
    {
      id: 7,
      filterbyTitle: 'Organization',
    },
    ...organizationFilters, // Inject dynamic organization data here
  ];

  const handleFilter = (filter: string, category?: string) => {
    const currentFilters = { ...memberFilter };

    switch (category) {
      case 'department': {
        const selected = currentFilters.DepartmentId || [];
        const newSelected = selected.includes(filter)
          ? selected.filter((id: string) => id !== filter) // Remove if already selected
          : [...selected, filter]; // Add if not selected
        dispatch(UpdateFilter({ filters: { ...currentFilters, DepartmentId: newSelected } }));
        break;
      }
      case 'district': {
        const selected = currentFilters.DistrictId || [];
        const newSelected = selected.includes(filter)
          ? selected.filter((id: string) => id !== filter)
          : [...selected, filter];
        dispatch(UpdateFilter({ filters: { ...currentFilters, DistrictId: newSelected } }));
        break;
      }
      case 'organization': {
        const selected = currentFilters.OrganizationId || [];
        const newSelected = selected.includes(filter)
          ? selected.filter((id: string) => id !== filter)
          : [...selected, filter];
        dispatch(UpdateFilter({ filters: { ...currentFilters, OrganizationId: newSelected } }));
        break;
      }
      case 'all':
      default:
        dispatch(
          UpdateFilter({
            filters: { OrganizationId: [], DistrictId: [], DepartmentId: [] },
          }),
        );
        break;
    }
  };

  const isAllEmpty =
    !memberFilter?.OrganizationId?.length &&
    !memberFilter?.DepartmentId?.length &&
    !memberFilter?.DistrictId?.length;

  return (
    <>
      <Box p={2}>
        <AddEditMember type="add" />
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
                  (filter.category === 'department' &&
                    memberFilter.DepartmentId?.includes(filter.filter!)) ||
                  (filter.category === 'district' &&
                    memberFilter.DistrictId?.includes(filter.filter!)) ||
                  (filter.category === 'organization' &&
                    memberFilter.OrganizationId?.includes(filter.filter!)) ||
                  (filter.category === 'all' && isAllEmpty)
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

export default TagFilter;
