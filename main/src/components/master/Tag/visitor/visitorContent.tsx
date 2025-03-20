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
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { fetchVisitor, visitorType, deleteVisitor } from 'src/store/apps/crud/visitor';
import AddEditVisitor from '../../CRUD/visitor/AddEditVisitor';
import { IconTrash } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';
import { useTranslation } from 'react-i18next';

const VisitorContent = () => {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const visitorDetail: visitorType | undefined = useSelector(
    (state: RootState) => state.visitorReducer.selectedVisitor,
  );
  const applicationData = useSelector((state: RootState) => state.applicationReducer.applications);

  const dispatch = useDispatch();
  const theme = useTheme();

  const warningColor = theme.palette.warning.main;
  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);

  const getAppName = (appId: string) => {
    const app = applicationData.find((a: ApplicationType) => a.id === appId);
    return app ? app.applicationName : 'Unknown App';
  };
  const [selectedVisitor, setSelectedVisitor] = useState<visitorType | null>(null);
  const handleOpenDeleteDialog = (vis: visitorType) => {
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
                alt="Member Profile"
                src={visitorDetail.faceImage}
                sx={{ width: '72px', height: '72px' }}
              />
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
                <CustomFormLabel htmlFor="status">Status</CustomFormLabel>
                <Typography>{visitorDetail.status}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{visitorDetail.phone}</Typography>
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{visitorDetail.gender}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Visit Time
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="arrival">Arrival</CustomFormLabel>
                <Typography>{formatTime(visitorDetail.visitorArrival)}</Typography>
                <CustomFormLabel htmlFor="end">End</CustomFormLabel>
                <Typography>{formatTime(visitorDetail.visitorEnd)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="regis-date">Registration Date</CustomFormLabel>
                <Typography>{formatDate(visitorDetail.registeredDate)}</Typography>
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
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Visits Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              {visitorDetail.status === 'Denied' || visitorDetail.status === 'Block' ? (
                <>
                  <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                    <CustomFormLabel
                      htmlFor={visitorDetail.status === 'Denied' ? 'deny-by' : 'block-by'}
                    >
                      {visitorDetail.status === 'Denied' ? 'Denied By' : 'Block By'}
                    </CustomFormLabel>
                    <Typography>
                      {visitorDetail.status === 'Denied'
                        ? visitorDetail.denyBy
                        : visitorDetail.blockBy}
                    </Typography>
                  </Grid>
                  <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                    <CustomFormLabel
                      htmlFor={visitorDetail.status === 'Denied' ? 'deny-reason' : 'block-reason'}
                    >
                      {visitorDetail.status === 'Denied' ? 'Denied Reason' : 'Block Reason'}
                    </CustomFormLabel>
                    <Typography>
                      {visitorDetail.status === 'Denied'
                        ? visitorDetail.reasonDeny
                        : visitorDetail.reasonBlock}
                    </Typography>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                    <CustomFormLabel htmlFor="check-in">Check-in By</CustomFormLabel>
                    <Typography>{visitorDetail.checkinBy}</Typography>
                    <CustomFormLabel htmlFor="portal-key">Portal Key</CustomFormLabel>
                    <Typography>{visitorDetail.portalKey}</Typography>
                  </Grid>
                  <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                    <CustomFormLabel htmlFor="check-out">Check-out By</CustomFormLabel>
                    <Typography>{visitorDetail.checkoutBy}</Typography>
                  </Grid>
                </>
              )}
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
