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
  Backdrop,
  CircularProgress,
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
import { visitorStatusEnumMap } from 'src/types/crud/input';
import {
  fetchTrxVisitorDT,
  SelectTrxVisitor,
  UpdateFilter,
  visitorStatusChange,
} from 'src/store/apps/crud/trxVisitor';
import toast from 'react-hot-toast';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import { createPortal } from 'react-dom';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Map enum value to MUI Chip color
const visitorStatusColorMap: Record<number, ChipColor> = {
  0: 'default',
  1: 'success',
  2: 'primary',
  3: 'warning',
  4: 'error',
  5: 'default',
  6: 'secondary',
  7: 'info',
};


const VisitorContent = () => {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const trxVisitorDetail = useSelector(
    (state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor,
  );
  const visitorDetail: VisitorType | undefined = trxVisitorDetail.visitor;
  const applicationData = useSelector((state: RootState) => state.applicationReducer.applications);
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const [reason, setReason] = useState('');
  const [openReasonMenu, setOpenReasonMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  // const theme = useTheme();

  useEffect(() => {
    setLoading(true);
    try {
      dispatch(fetchApplications());
      dispatch(fetchDistricts());
      dispatch(fetchDepartments());
      dispatch(fetchOrganizations());
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
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

  const getOrganizationDisplay = (
    organization?: string,
    department?: string,
    district?: string,
  ) => {
    return [organization, department, district].filter((v) => v && v.trim() !== '').join(' - ');
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

  const handleCheckin = async () => {
    setLoading(true);
    if (!trxVisitorDetail.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(
        visitorStatusChange({ trxVisitorId: trxVisitorDetail.id, status: 'checkin' }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Visitor checked in successfully');
        dispatch(UpdateFilter(defaultTrxVisitorFilter));
        await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
        dispatch(SelectTrxVisitor(trxVisitorDetail.id));
      } else {
        toast.error('Error checking in visitor');
      }
    } catch (error) {
      toast.error('Error checking in visitor');
      console.error('Error checking in visitor:', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  const handleCheckout = async () => {
    setLoading(true);
    if (!trxVisitorDetail.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(
        visitorStatusChange({ trxVisitorId: trxVisitorDetail.id, status: 'checkout' }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Visitor checked out successfully');
        dispatch(UpdateFilter(defaultTrxVisitorFilter));
        await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
        dispatch(SelectTrxVisitor(trxVisitorDetail.id));
      } else {
        toast.error('Error checking out visitor');
      }
    } catch (error) {
      toast.error('Error checking out visitor');
      console.error('Error checking out visitor:', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  const handleDeny = async () => {
    setLoading(true);
    if (!trxVisitorDetail.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(
        visitorStatusChange({ trxVisitorId: trxVisitorDetail.id, status: 'denied' }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Visitor denied successfully');
        dispatch(UpdateFilter(defaultTrxVisitorFilter));
        await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
        dispatch(SelectTrxVisitor(trxVisitorDetail.id));
      } else {
        toast.error('Error denying visitor');
      }
    } catch (error) {
      toast.error('Error denying visitor');
      console.error('Error denying visitor:', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
        handleCloseReasonMenu();
      }, 500);
    }
  };
  const handleBlock = async () => {
    setLoading(true);
    if (!trxVisitorDetail.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(
        visitorStatusChange({ trxVisitorId: trxVisitorDetail.id, status: 'blocked' }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Visitor blocked successfully');
        dispatch(UpdateFilter(defaultTrxVisitorFilter));
        await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
        dispatch(SelectTrxVisitor(trxVisitorDetail.id));
      } else {
        toast.error('Error blocking visitor');
      }
    } catch (error) {
      toast.error('Error blocking visitor');
      console.error('Error blocking visitor:', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
        handleCloseReasonMenu();
      }, 500);
    }
  };

  const handleCloseReasonMenu = () => {
    setReason('');
    setOpenReasonMenu(false);
  };
  const handleConfirmReason = () => {
    if (trxVisitorDetail.status === 'Checkin') {
      // block action
      handleBlock();
    } else {
      // deny action
      handleDeny();
    }
  };
  const statusValue = trxVisitorDetail?.status
    ? visitorStatusEnumMap[trxVisitorDetail.status]
    : undefined;
  const chipColor = statusValue !== undefined ? visitorStatusColorMap[statusValue] : 'default';

  console.log(statusValue, chipColor);
  // console.log(`${BASE_URL}${visitorDetail?.faceImage}`);
  return (
    <>
      {visitorDetail && trxVisitorDetail ? (
        <>
          {/* Header Part */}
          <Box
            p={3}
            py={2}
            display={'flex'}
            alignItems={'center'}
            sx={{
              backgroundColor: (theme) =>
                chipColor !== 'default' ? theme.palette[chipColor].main : theme.palette.grey[300],
            }}
          >
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

          <Box
            sx={{
              overflow: 'auto',
              height: { lg: 'calc(100vh - 220px)', md: '100vh' },
              maxHeight: '800px',
            }}
            p={5}
          >
            {/* Avatar + Actions */}
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              mb={3}
              sx={{ position: 'relative' }} // <-- make this the positioning context
            >
              <Avatar
                alt="Visitor Face"
                src={`${BASE_URL}${trxVisitorDetail.visitor?.faceImage}`}
                sx={{ width: 200, height: 200, mb: 2 }}
              />

              {/* Floating actions (hidden if checked-out) */}
              {(trxVisitorDetail?.status === 'Checkin' ||
                trxVisitorDetail?.status === 'Preregist') && (
                <Box
                  sx={{
                    position: { xs: 'static', md: 'absolute' }, // stack on small screens
                    top: { md: 0 }, // align with avatar top
                    left: { md: 0 }, // stick to top-right
                    zIndex: 2,
                  }}
                >
                  <Stack spacing={1} direction="column" alignItems="flex-start">
                    <Button
                      size="large"
                      variant="contained"
                      color={trxVisitorDetail.status === 'Checkin' ? 'warning' : 'success'}
                      onClick={() =>
                        trxVisitorDetail.status === 'Checkin' ? handleCheckout() : handleCheckin()
                      }
                      sx={{ boxShadow: 2, width: 200, height: 50 }}
                    >
                      {trxVisitorDetail.status === 'Checkin'
                        ? 'Check-out Visitor'
                        : 'Check-in Visitor'}
                    </Button>

                    <Button
                      size="large"
                      variant="contained"
                      color="error"
                      onClick={() => setOpenReasonMenu(true)}
                      sx={{ boxShadow: 2, width: 200, height: 50 }}
                    >
                      {trxVisitorDetail.status === 'Checkin' ? 'Block Visitor' : 'Deny Visitor'}
                    </Button>
                  </Stack>
                </Box>
              )}

              <Typography variant="h4" fontWeight={800}>
                {trxVisitorDetail.visitor?.name}
              </Typography>
            </Box>

            {trxVisitorDetail.status}

            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.email}</Typography>
                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.address}</Typography>
                <CustomFormLabel htmlFor="organization">Organization</CustomFormLabel>
                <Typography>
                  {getOrganizationDisplay(
                    trxVisitorDetail.visitor?.organizationName,
                    trxVisitorDetail.visitor?.departmentName,
                    trxVisitorDetail.visitor?.districtName,
                  )}
                </Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.phone}</Typography>
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.gender}</Typography>
                <CustomFormLabel htmlFor="status">Status</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.isVip ? 'VIP' : 'Normal'}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Visit Time
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="arrival">Arrival</CustomFormLabel>
                <Typography>{formatTime(trxVisitorDetail.visitorPeriodStart)}</Typography>
                <CustomFormLabel htmlFor="end">End</CustomFormLabel>
                <Typography>{formatTime(trxVisitorDetail.visitorPeriodEnd)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="accepted">Accepted</CustomFormLabel>
                <Typography>{trxVisitorDetail.isInvitationAccepted ? 'Yes' : 'No'}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.personId}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.identityId}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.cardNumber}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.bleCardNumber}</Typography>
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
      <Dialog open={openReasonMenu} onClose={handleCloseReasonMenu} fullWidth maxWidth="sm">
        <DialogTitle mb={2} p={2}>
          Reason
        </DialogTitle>
        <DialogContent>
          <Grid size={12} direction={'column'} p={1}>
            <CustomTextField
              id="reason"
              label="Reason"
              multiline
              fullWidth
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
            />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReasonMenu} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmReason} color="error">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      {loading &&
        createPortal(
          <Backdrop
            open={loading}
            sx={{
              color: '#fff',
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>,
          document.body,
        )}
    </>
  );
};

export default VisitorContent;
