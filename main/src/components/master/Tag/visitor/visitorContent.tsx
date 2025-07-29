import { BASE_URL } from 'src/utils/axios';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Stack,
  Grid2 as Grid,
  Tooltip,
  // useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { masterVisitorType, deleteVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import AddEditVisitor from '../../CRUD/visitor/AddEditVisitor';
import { IconTrash } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';
import { useTranslation } from 'react-i18next';
import { DepartmentType, fetchDepartments } from 'src/store/apps/crud/department';
import { DistrictType, fetchDistricts } from 'src/store/apps/crud/district';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';


const VisitorContent = () => {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const visitorDetail: VisitorType | undefined = useSelector(
    (state: RootState) => state.visitorReducer.selectedVisitor,
  );
  const applicationData = useSelector((state: RootState) => state.applicationReducer.applications);
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const dispatch = useDispatch();
  // const theme = useTheme();

  useEffect(() => {
    dispatch(fetchApplications());
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
  }, [dispatch]);

  const getAppName = (appId: string) => {
    const app = applicationData.find((a: ApplicationType) => a.id === appId);
    return app ? app.applicationName : 'Unknown App';
  };

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
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType | null>(null);
  const handleOpenDeleteDialog = (vis: VisitorType) => {
    setSelectedVisitor(vis);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedVisitor(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedVisitor) {
      dispatch(deleteVisitor(selectedVisitor.id));
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
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };
  console.log(`${BASE_URL}${visitorDetail?.faceImage}`);
  return (
    <>
      {visitorDetail ? (
        <>
          {/* Header Part */}
          <Box p={3} py={2} display={'flex'} alignItems={'center'}>
            <Typography variant="h4">Visitor Details</Typography>
            <Stack gap={0} direction="row" ml={'auto'}>
              <Tooltip title="Edit">
                <AddEditVisitor visitor={visitorDetail} type="edit" />
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton onClick={() => handleOpenDeleteDialog(visitorDetail)}>
                  <IconTrash size="18" stroke={1.3} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider />
          {/* Table Part */}

          <Box sx={{ overflow: 'auto' }} p={5}>
            <Box display="flex" alignItems="center">
              <Avatar
                alt="Visitor Face"
                src={visitorDetail.faceImage ? `${BASE_URL}${visitorDetail.faceImage}` : undefined}
                sx={{ width: '72px', height: '72px' }}
              >
                {/* {visitorDetail.name?.charAt(0) || '?'} */}
              </Avatar>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6" mb={0.5}>
                  {visitorDetail.name}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <Typography>{visitorDetail.email}</Typography>
                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{visitorDetail.address}</Typography>
                <CustomFormLabel htmlFor="organization">Organization Name</CustomFormLabel>
                <Typography>{getOrganizationName(visitorDetail.organizationId)}</Typography>
                <CustomFormLabel htmlFor="department">Department Name</CustomFormLabel>
                <Typography>{getDepartmentName(visitorDetail.departmentId)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{visitorDetail.phone}</Typography>
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{visitorDetail.gender}</Typography>
                <CustomFormLabel htmlFor="status">Status</CustomFormLabel>
                <Typography>{visitorDetail.isVip ? 'VIP' : 'Normal'}</Typography>
                <CustomFormLabel htmlFor="district">District Name</CustomFormLabel>
                <Typography>{getDistrictName(visitorDetail.districtId)}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Visit Time
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="arrival">Arrival</CustomFormLabel>
                <Typography>{formatTime(visitorDetail.visitorPeriodStart)}</Typography>
                <CustomFormLabel htmlFor="end">End</CustomFormLabel>
                <Typography>{formatTime(visitorDetail.visitorPeriodEnd)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="regis-date">Verified</CustomFormLabel>
                <Typography>{visitorDetail.isEmailVerified ? 'Yes' : 'No'}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{visitorDetail.personId}</Typography>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{visitorDetail.identityId}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="applicationID">Application Name</CustomFormLabel>
                <Typography>{getAppName(visitorDetail.applicationId)}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <Typography>{visitorDetail.cardNumber}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>{visitorDetail.bleCardNumber}</Typography>
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
            <Typography variant="h4">Please Select a Visitor</Typography>
            <br />
          </Box>
        </Box>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete visitor <strong>{selectedVisitor?.name}</strong>?
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

export default VisitorContent;
