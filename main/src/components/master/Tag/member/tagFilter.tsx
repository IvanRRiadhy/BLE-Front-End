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
import { IconFolder, IconClearAll } from '@tabler/icons-react';
import AddEditMember from '../../CRUD/member/AddEditMember';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { fetchDistricts, DistrictType } from 'src/store/apps/crud/district';
import { UpdateFilter } from 'src/store/apps/crud/member';
import { defaultMemberFilter } from 'src/store/apps/defaultForm';

interface DataType {
  id: string | number;
  name?: string;
  filter?: string;
  icon?: React.ElementType; // ✅ more specific type
  filterbyTitle?: string;
  divider?: boolean;
  color?: string;
  category?: 'department' | 'district' | 'organization' | 'all';
}

const TagFilter = () => {
  const dispatch = useDispatch();

  const customizer = useSelector((state: RootState) => state.customizer);
  const br = `${customizer.borderRadius}px`;

  const departmentData = useSelector((state: RootState) => state.departmentReducer.departmentAll);
  const districtData = useSelector((state: RootState) => state.districtReducer.districtAll);
  const organizationData = useSelector((state: RootState) => state.organizationReducer.organizationAll);
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter.filters);

  // -------------------------------------------------------------------------
  // ✅ Fetch lists once (if empty)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (departmentData.length === 0) dispatch(fetchDepartments());
    if (districtData.length === 0) dispatch(fetchDistricts());
    if (organizationData.length === 0) dispatch(fetchOrganizations());
  }, [dispatch, departmentData, districtData, organizationData]);

  // -------------------------------------------------------------------------
  // ✅ Transform Data into Filter Format
  // -------------------------------------------------------------------------
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

  const organizationFilters: DataType[] = organizationData.map((org: OrganizationType) => ({
    id: org.id,
    name: org.name,
    filter: org.id,
    category: 'organization',
    icon: IconFolder,
  }));

  // -------------------------------------------------------------------------
  // ✅ Combine all into unified list
  // -------------------------------------------------------------------------
  const filterData: DataType[] = [
    { id: 'all', name: 'All', filter: 'show_all', icon: IconClearAll, category: 'all' },
    { id: 'divider-1', divider: true },
    { id: 'title-dept', filterbyTitle: 'Department' },
    ...departmentFilters,
    { id: 'divider-2', divider: true },
    { id: 'title-dist', filterbyTitle: 'District' },
    ...districtFilters,
    { id: 'divider-3', divider: true },
    { id: 'title-org', filterbyTitle: 'Organization' },
    ...organizationFilters,
  ];

  // -------------------------------------------------------------------------
  // ✅ Handle Filter Selection
  // -------------------------------------------------------------------------
  const handleFilter = (filter: string, category?: string) => {
    const currentFilters = { ...memberFilter };

    const toggleSelection = (key: keyof typeof currentFilters) => {
      const selected = currentFilters[key] || [];
      const newSelected = selected.includes(filter)
        ? selected.filter((id: string) => id !== filter)
        : [...selected, filter];

      const updatedFilters = { ...currentFilters, [key]: newSelected };
      dispatch(UpdateFilter({ filters: updatedFilters }));
    };

    switch (category) {
      case 'department':
        toggleSelection('DepartmentId');
        break;
      case 'district':
        toggleSelection('DistrictId');
        break;
      case 'organization':
        toggleSelection('OrganizationId');
        break;
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

  // -------------------------------------------------------------------------
  // ✅ Helper: Check if all filters are empty
  // -------------------------------------------------------------------------
  const isAllEmpty =
    !memberFilter?.OrganizationId?.length &&
    !memberFilter?.DepartmentId?.length &&
    !memberFilter?.DistrictId?.length;

  // -------------------------------------------------------------------------
  // ✅ Render Component
  // -------------------------------------------------------------------------
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
                  key={filter.id}
                  variant="subtitle1"
                  fontWeight={600}
                  pl={5.1}
                  mt={1}
                  pb={2}
                >
                  {filter.filterbyTitle}
                </Typography>
              );
            }

            if (filter.divider) return <Divider key={filter.id} sx={{ mb: 3 }} />;

            const IconComponent = filter.icon;

            const isSelected =
              (filter.category === 'department' &&
                memberFilter.DepartmentId?.includes(filter.filter!)) ||
              (filter.category === 'district' &&
                memberFilter.DistrictId?.includes(filter.filter!)) ||
              (filter.category === 'organization' &&
                memberFilter.OrganizationId?.includes(filter.filter!)) ||
              (filter.category === 'all' && isAllEmpty);

            return (
              <ListItemButton
                key={filter.id}
                sx={{
                  mb: 1,
                  mx: 3,
                  borderRadius: br,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' },
                  },
                }}
                selected={isSelected}
                onClick={() => handleFilter(filter.filter!, filter.category)}
              >
                {IconComponent && (
                  <ListItemIcon sx={{ minWidth: '30px', color: filter.color }}>
                    <IconComponent stroke="1.5" size={19} />
                  </ListItemIcon>
                )}
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
