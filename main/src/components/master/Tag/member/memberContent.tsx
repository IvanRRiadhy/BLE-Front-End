import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Stack,
  Grid2 as Grid,
  Tooltip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  fetchMembers,
  memberType,
  deleteMember,
  editMember,
  SelectMember,
} from 'src/store/apps/crud/member';
import AddEditMember from '../../CRUD/member/AddEditMember';
import { IconTrash } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DepartmentType, fetchDepartments } from 'src/store/apps/crud/department';
import { DistrictType, fetchDistricts } from 'src/store/apps/crud/district';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';
import { useTranslation } from 'react-i18next';
import IconClose from 'src/assets/images/frontend-pages/icons/icon-close.svg';

const MemberContent = () => {
  const { t } = useTranslation();
  const memberDetail: memberType | undefined = useSelector(
    (state: RootState) => state.memberReducer.selectedMember,
  );
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const applicationData = useSelector((state: RootState) => state.applicationReducer.applications);

  const dispatch = useDispatch();
  const theme = useTheme();

  const warningColor = theme.palette.warning.main;

  useEffect(() => {
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
    dispatch(fetchApplications());
  }, [dispatch]);

  const getDepartmentName = (departmentId: string) => {
    const department = departmentData.find((dpt: DepartmentType) => dpt.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };

  const getDistrictName = (districtId: string) => {
    const district = districtData.find((dst: DistrictType) => dst.id === districtId);
    return district ? district.name : 'Unknown District';
  };

  const getOrganizationName = (organizationId: string) => {
    const organization = organizationData.find(
      (org: OrganizationType) => org.id === organizationId,
    );
    return organization ? organization.name : 'Unknown Organization';
  };
  const getAppName = (appId: string) => {
    const app = applicationData.find((a: ApplicationType) => a.id === appId);
    return app ? app.applicationName : 'Unknown App';
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<memberType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (mem: memberType) => {
    setSelectedMember(mem);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMember(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedMember) {
      dispatch(deleteMember(selectedMember.id));
    }
    handleCloseDeleteDialog();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  return (
    <>
      {memberDetail ? (
        <>
          {/* Header Part */}
          <Box p={3} py={2} display={'flex'} alignItems={'center'}>
            <Typography variant="h4">Member Details</Typography>
            <Stack gap={0} direction="row" ml={'auto'}>
              <Tooltip title="Edit">
                <AddEditMember member={memberDetail} type="edit" />
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton onClick={() => handleOpenDeleteDialog(memberDetail)}>
                  <IconTrash size="18" stroke={1.3} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton onClick={() => dispatch(SelectMember(''))}>
                  <img src={IconClose} alt={IconClose} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider />
          {/* Table Part */}

          <Box sx={{ overflow: 'auto' }} p={5}>
            <Box display="flex" alignItems="center">
              <Avatar
                alt="Member Profile"
                src={memberDetail.faceImage}
                sx={{ width: '72px', height: '72px' }}
              />
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6" mb={0.5}>
                  {memberDetail.name}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <Typography>{memberDetail.email}</Typography>
                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{memberDetail.address}</Typography>
                <CustomFormLabel htmlFor="birth-Date">Birth Date</CustomFormLabel>
                <Typography>{formatDate(memberDetail.birthDate)}</Typography>
                <CustomFormLabel htmlFor="join-Date">Join Date</CustomFormLabel>
                <Typography>{formatDate(memberDetail.joinDate)}</Typography>
                <CustomFormLabel htmlFor="exit-Date">Exit Date</CustomFormLabel>
                <Typography>{formatDate(memberDetail.exitDate)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{memberDetail.phone}</Typography>
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{memberDetail.gender}</Typography>
                <CustomFormLabel htmlFor="head-Member-1">Head Member 1</CustomFormLabel>
                <Typography>{memberDetail.headMember1}</Typography>
                <CustomFormLabel htmlFor="head-Member-2">Head Member 2</CustomFormLabel>
                <Typography>{memberDetail.headMember2}</Typography>
                <CustomFormLabel htmlFor="status-employee">Status Employee</CustomFormLabel>
                <Typography>{memberDetail.statusEmployee}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{memberDetail.personId}</Typography>
                <CustomFormLabel htmlFor="department-Id">Department Name</CustomFormLabel>
                <Typography>{getDepartmentName(memberDetail.departmentId)}</Typography>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{memberDetail.identityId}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="organization-id">Organization Name</CustomFormLabel>
                <Typography>{getOrganizationName(memberDetail.organizationId)}</Typography>
                <CustomFormLabel htmlFor="district-id">District Name</CustomFormLabel>
                <Typography>{getDistrictName(memberDetail.districtId)}</Typography>
                <CustomFormLabel htmlFor="applicationID">Application Name</CustomFormLabel>
                <Typography>{getAppName(memberDetail.applicationId)}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <Typography>{memberDetail.cardNumber}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>{memberDetail.bleCardNumber}</Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      ) : (
        <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
          {/* ------------------------------------------- */}
          {/* If no Contact  */}
          {/* ------------------------------------------- */}
          <Box>
            <Typography variant="h4">Please Select a Member</Typography>
            <br />
          </Box>
        </Box>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete member <strong>{selectedMember?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemberContent;
