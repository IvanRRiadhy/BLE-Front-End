import { useEffect, useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { PaginatedResponse, useAllDepartments } from 'src/hooks/useDepartment';
import { useAllDistricts } from 'src/hooks/useDistrict';
import { useAllOrganizations } from 'src/hooks/useOrganization';

type ArrayFilterKey = 'OrganizationId' | 'DepartmentId' | 'DistrictId';

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

const SecurityGuardFilter = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const settings = useSelector((state: RootState) => state.settings);
  const br = `${settings.borderRadius}px`;

  // const departmentData = useSelector((state: RootState) => state.departmentReducer.departmentAll);
  // const districtData = useSelector((state: RootState) => state.districtReducer.districtAll);
  // const organizationData = useSelector(
  //   (state: RootState) => state.organizationReducer.organizationAll,
  // );
  const departmentData = useAllDepartments().data || [];
  const districtData = useAllDistricts().data || [];
  const organizationData = useAllOrganizations().data || [];
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter.filters);
  const [draftFilter, setDraftFilter] = useState(memberFilter);
  // -------------------------------------------------------------------------
  // ✅ Fetch lists once (if empty)
  // -------------------------------------------------------------------------
  // useEffect(() => {
  //   if (departmentData.length === 0) dispatch(fetchDepartments());
  //   if (districtData.length === 0) dispatch(fetchDistricts());
  //   if (organizationData.length === 0) dispatch(fetchOrganizations());
  // }, [dispatch, departmentData, districtData, organizationData]);

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
useEffect(() => {
  setDraftFilter(memberFilter);
}, [memberFilter]);
  // -------------------------------------------------------------------------
  // ✅ Handle Filter Selection
  // -------------------------------------------------------------------------
  // const handleFilter = (filter: string, category?: string) => {
  //   const currentFilters = { ...memberFilter };

  //   const toggleSelection = (key: ArrayFilterKey, filter: string) => {
  //     const selected = currentFilters[key] ?? [];

  //     const newSelected = selected.includes(filter)
  //       ? selected.filter((id: string) => id !== filter)
  //       : [...selected, filter];

  //     dispatch(
  //       UpdateFilter({
  //         filters: { ...currentFilters, [key]: newSelected },
  //       }),
  //     );
  //   };

  //   switch (category) {
  //     case 'department':
  //       toggleSelection('DepartmentId', filter);
  //       break;
  //     case 'district':
  //       toggleSelection('DistrictId', filter);
  //       break;
  //     case 'organization':
  //       toggleSelection('OrganizationId', filter);
  //       break;
  //     case 'all':
  //     default:
  //       dispatch(
  //         UpdateFilter({
  //           filters: { OrganizationId: [], DistrictId: [], DepartmentId: [] },
  //         }),
  //       );
  //       break;
  //   }
  // };
  const handleFilter = (filter: string, category?: string) => {
    const currentFilters = { ...draftFilter };

    const toggleSelection = (key: ArrayFilterKey, filter: string) => {
      const selected = currentFilters[key] ?? [];

      const newSelected = selected.includes(filter)
        ? selected.filter((id: string) => id !== filter)
        : [...selected, filter];

      setDraftFilter({
        ...currentFilters,
        [key]: newSelected,
      });
    };

    switch (category) {
      case 'department':
        toggleSelection('DepartmentId', filter);
        break;
      case 'district':
        toggleSelection('DistrictId', filter);
        break;
      case 'organization':
        toggleSelection('OrganizationId', filter);
        break;
      case 'all':
      default:
        setDraftFilter({
          OrganizationId: [],
          DistrictId: [],
          DepartmentId: [],
        });
        break;
    }
  };

  // -------------------------------------------------------------------------
  // ✅ Helper: Check if all filters are empty
  // -------------------------------------------------------------------------
  const isChanged = JSON.stringify(draftFilter) !== JSON.stringify(memberFilter);

  const isAllEmpty =
    !draftFilter?.OrganizationId?.length &&
    !draftFilter?.DepartmentId?.length &&
    !draftFilter?.DistrictId?.length;

  const totalSelected =
    (draftFilter.OrganizationId?.length || 0) +
    (draftFilter.DepartmentId?.length || 0) +
    (draftFilter.DistrictId?.length || 0);

  const handleApply = () => {
    dispatch(
      UpdateFilter({
        filters: draftFilter,
      }),
    );
  };

  const handleReset = () => {
    setDraftFilter({
      OrganizationId: [],
      DepartmentId: [],
      DistrictId: [],
    });
  };

  // -------------------------------------------------------------------------
  // ✅ Render Component
  // -------------------------------------------------------------------------
return (
  <Box display="flex" flexDirection="column" height="100%">
    {/* Add */}
    <Box p={2}>
      <AddEditMember type="add" />
    </Box>

    {/* Sticky ALL */}
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: isChanged ? 'info.light' : 'background.paper',
      }}
    >
      <List>
        {filterData
          .filter((f) => f.category === 'all')
          .map((filter) => {
            const IconComponent = filter.icon;

            const isSelected =
              !draftFilter?.OrganizationId?.length &&
              !draftFilter?.DepartmentId?.length &&
              !draftFilter?.DistrictId?.length;

            return (
              <ListItemButton
                key={filter.id}
                selected={isSelected}
                onClick={() => handleFilter(filter.filter!, filter.category)}
                sx={{
                  mx: 3,
                  borderRadius: br,

                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'primary.dark',
                    color: 'white',
                  },
                }}
              >
                {IconComponent && (
                  <ListItemIcon sx={{ minWidth: '30px' }}>
                    <IconComponent stroke="1.5" size={19} />
                  </ListItemIcon>
                )}
                <ListItemText primary={filter.name} />
              </ListItemButton>
            );
          })}
      </List>
      <Divider />
    </Box>

    {/* Scroll */}
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      <List>
        {filterData
          .filter((f) => f.category !== 'all')
          .map((filter) => {
            if (filter.filterbyTitle) {
              return (
                <Typography key={filter.id} pl={5.1} mt={1} pb={2}>
                  {filter.filterbyTitle}
                </Typography>
              );
            }

            if (filter.divider)
              return <Divider key={filter.id} sx={{ mb: 3 }} />;

            const IconComponent = filter.icon;

            const isSelected =
              (filter.category === 'department' &&
                draftFilter.DepartmentId?.includes(filter.filter!)) ||
              (filter.category === 'district' &&
                draftFilter.DistrictId?.includes(filter.filter!)) ||
              (filter.category === 'organization' &&
                draftFilter.OrganizationId?.includes(filter.filter!));

            return (
              <ListItemButton
                key={filter.id}
                selected={isSelected}
                onClick={() => handleFilter(filter.filter!, filter.category)}
                sx={{
                  mb: 1,
                  mx: 3,
                  borderRadius: br,

                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'primary.dark',
                    color: 'white',
                  },
                }}
              >
                {IconComponent && (
                  <ListItemIcon sx={{ minWidth: '30px' }}>
                    <IconComponent stroke="1.5" size={19} />
                  </ListItemIcon>
                )}
                <ListItemText primary={filter.name} />
              </ListItemButton>
            );
          })}
      </List>
    </Box>

    {/* Bottom Actions */}
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        display: 'flex',
        gap: 1,
      }}
    >
      <ListItemButton
        onClick={handleReset}
        disabled={totalSelected === 0}
        sx={{
          flex: 1,
          justifyContent: 'center',
          borderRadius: br,
          backgroundColor: 'grey.200',
        }}
      >
        <ListItemText primary="Reset" />
      </ListItemButton>

      <ListItemButton
        disabled={!isChanged}
        onClick={handleApply}
        sx={{
          flex: 2,
          justifyContent: 'center',
          borderRadius: br,
          backgroundColor: isChanged ? 'primary.main' : 'grey.300',
          color: isChanged ? 'white' : 'grey.500',

          '&:hover': {
            backgroundColor: isChanged ? 'primary.dark' : 'grey.300',
            color: isChanged ? 'white' : 'grey.500',
          },
        }}
      >
        <ListItemText
          primary={
            totalSelected > 0
              ? `Apply Filter (${totalSelected})`
              : 'Apply Filter'
          }
        />
      </ListItemButton>
    </Box>
  </Box>
);
};

export default SecurityGuardFilter;
