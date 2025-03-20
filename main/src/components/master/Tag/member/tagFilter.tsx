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
import { IconMail, IconSend, IconBucket, IconFolder } from '@tabler/icons-react';
import { SetVisibilityFilter } from 'src/store/apps/crud/member';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import AddEditMember from '../../CRUD/member/AddEditMember';
import { DistrictType, fetchDistricts } from 'src/store/apps/crud/district';

interface DataType {
  id: string | number;
  name?: string;
  sort?: string;
  icon?: any;
  filterbyTitle?: string;
  divider?: boolean;
  color?: string;
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

  useEffect(() => {
    dispatch(fetchDepartments());
    dispatch(fetchDistricts());
    dispatch(fetchOrganizations());
  }, [dispatch]);

  const departmentFilters: DataType[] = departmentData.map((dept: DepartmentType) => ({
    id: dept.id,
    name: dept.name,
    sort: dept.id,
    icon: IconFolder,
  }));

  const districtFilters: DataType[] = districtData.map((dist: DistrictType) => ({
    id: dist.id,
    name: dist.name,
    sort: dist.id,
    icon: IconFolder,
  }));

  const organizationFilters: DataType[] = organizationData.map((orgz: OrganizationType) => ({
    id: orgz.id,
    name: orgz.name,
    sort: orgz.id,
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

  return (
    <>
      <Box p={2}>
        <AddEditMember type="add" />
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

export default TagFilter;
