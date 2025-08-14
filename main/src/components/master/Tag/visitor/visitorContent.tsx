import { BASE_URL } from 'src/utils/axios';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  Typography,
  Avatar,
  Divider,
  Stack,
  Grid2 as Grid,
  // useTheme,
  Dialog,
  DialogTitle,
  DialogContent,

  DialogActions,
  Backdrop,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import {VisitorType } from 'src/store/apps/crud/visitor';

import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

import { useTranslation } from 'react-i18next';
import { visitorStatusEnumMap } from 'src/types/crud/input';
import {
  fetchTrxVisitorDT,
  SelectTrxVisitor,
  UpdateFilter,
  visitorCheckIn,
  visitorCheckOut,
  visitorStatusChange,
} from 'src/store/apps/crud/trxVisitor';
import toast from 'react-hot-toast';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { defaultCardFilter, defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import { createPortal } from 'react-dom';
import {  CardType,  fetchCardDT } from 'src/store/apps/crud/card';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import VisitorActions from './visitorActions';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Map enum value to MUI Chip color
const visitorStatusColorMap: Record<number, ChipColor> = {
  0: 'default',
  1: 'success',
  2: 'default',
  3: 'warning',
  4: 'error',
  5: 'success',
  6: 'primary',
  7: 'secondary',
};

const VisitorContent = () => {
  const { t } = useTranslation();
  const trxVisitorDetail = useSelector(
    (state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor,
  );
  const visitorDetail: VisitorType | undefined = trxVisitorDetail.visitor;
  const cardData = useSelector((state: RootState) => state.CardReducer.cards);
  const [reason, setReason] = useState('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [openReasonMenu, setOpenReasonMenu] = useState(false);
  const [openCardMenu, setOpenCardMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  // const theme = useTheme();

  useEffect(() => {
    setLoading(true);
    try {
      dispatch(fetchCardDT({ ...defaultCardFilter, length: 0, fiters: { IsUsed: false } }));
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [dispatch]);


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
    if (!cardData.some((card: CardType) => card.id === selectedCard)) {
      setLoading(false);
      toast.error('Please select a card');
      return;
    }
    try {
      const result = await dispatch(
        visitorCheckIn({ TrxVisitorId: trxVisitorDetail.id, CardId: selectedCard }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Visitor checked in successfully');
        dispatch(UpdateFilter(defaultTrxVisitorFilter));
        await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
        dispatch(SelectTrxVisitor(trxVisitorDetail.id));
        setTimeout(() => {
          handleCloseCardMenu();
        }, 500);
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
      const result = await dispatch(visitorCheckOut(trxVisitorDetail.id));
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

  const handleUnblock = async () => {
    setLoading(true);
    if (!trxVisitorDetail.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(
        visitorStatusChange({ trxVisitorId: trxVisitorDetail.id, status: 'unblocked' }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Visitor unblocked successfully');
        dispatch(UpdateFilter(defaultTrxVisitorFilter));
        await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
        dispatch(SelectTrxVisitor(trxVisitorDetail.id));
      } else {
        toast.error('Error unblocking visitor');
      }
    } catch (error) {
      toast.error('Error unblocking visitor');
      console.error('Error unblocking visitor:', error);
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

  const handleCloseCardMenu = () => {
    setSelectedCard('');
    setOpenCardMenu(false);
  };


  const statusValue = trxVisitorDetail?.status
    ? visitorStatusEnumMap[trxVisitorDetail.status]
    : undefined;
  const chipColor = statusValue !== undefined ? visitorStatusColorMap[statusValue] : 'default';

  console.log(statusValue, chipColor);
  // console.log(`${BASE_URL}${visitorDetail?.faceImage}`)
  // ;
  const status = trxVisitorDetail?.status;

  const actionMap: Record<
    string,
    {
      primary?: { label: string; color: 'success' | 'warning' | 'error'; onClick: () => void };
      secondary?: { label: string; color: 'error' | 'warning' | 'success'; onClick: () => void };
    }
  > = {
    Preregist: {
      primary: { label: 'Deny Visitor', color: 'error', onClick: () => setOpenReasonMenu(true) },
    },
    Precheckin: {
      primary: {
        label: 'Check-in Visitor',
        color: 'success',
        onClick: () =>{ 
          dispatch(fetchCardDT({ ...defaultCardFilter, length: 0, fiters: { IsUsed: false } }))
          setOpenCardMenu(true)},
      },
      secondary: { label: 'Deny Visitor', color: 'error', onClick: () => setOpenReasonMenu(true) },
    },
    Checkin: {
      primary: { label: 'Check-out Visitor', color: 'warning', onClick: handleCheckout },
      secondary: { label: 'Block Visitor', color: 'error', onClick: () => setOpenReasonMenu(true) },
    },
    Unblock: {
      primary: { label: 'Check-out Visitor', color: 'warning', onClick: handleCheckout },
      secondary: { label: 'Block Visitor', color: 'error', onClick: () => setOpenReasonMenu(true) },
    },
    Block: {
      primary: { label: 'Check-out Visitor', color: 'warning', onClick: handleCheckout },
      secondary: { label: 'Unblock Visitor', color: 'success', onClick: handleUnblock }, // You'll need to define handleUnblock
    },
  };

  const currentActions = status ? actionMap[status] : undefined;

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
                            <VisitorActions trxVisitorDetail={trxVisitorDetail} floating />

              <Typography variant="h4" fontWeight={800}>
                {trxVisitorDetail.visitor?.name}
              </Typography>
            </Box>

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
                <Typography>{trxVisitorDetail.visitor?.cardNumber ?? "Not Assigned"}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.bleCardNumber ?? "Not Assigned"}</Typography>
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

      {/* Card Assign Pop-up */}
      <Dialog open={openCardMenu} onClose={handleCloseCardMenu} fullWidth maxWidth="sm">
        <DialogTitle mb={2} p={2}>
          Assign Card
        </DialogTitle>
        <DialogContent>
          <Grid size={12} direction={'column'} p={1}>
            <CustomSelect
              name="selectedCard"
              value={selectedCard || ''}
              onChange={(e: any) => setSelectedCard(e.target.value)}
              fullWidth
              variant="outlined"
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200, // Set the maximum height of the dropdown menu
                    width: 100, // Adjust the width of the dropdown menu
                  },
                },
              }}
            >
              <MenuItem value="" disabled>
                Select Card to Assign
              </MenuItem>
              {cardData.map((card) => (
                <MenuItem key={card.id} value={card.id}>
                  {card.name} | {card.cardNumber}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCardMenu} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleCheckin();
            }}
            color="primary"
          >
            Assign Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reason Pop-up */}
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
