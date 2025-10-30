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
  IconButton,
  Tooltip,
  useTheme,
  Chip,
} from '@mui/material';
import { VisitorType } from 'src/store/apps/crud/visitor';
import IconClose from 'src/assets/images/frontend-pages/icons/icon-close.svg';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { IconX } from '@tabler/icons-react';
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
import { CardType, fetchCardDT } from 'src/store/apps/crud/card';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import VisitorActions from './visitorActions';
import VisitorTrackingPopup from './VisitorTrackingPopup';
import VisitorTrackingHistoryPopup from './VisitorTrackingHistoryPopup';

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
  const theme = useTheme();
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
  const [localCardData, setLocalCardData] = useState<CardType[]>([]);

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

  // console.log(statusValue, chipColor);
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
        onClick: () => {
          console.log('Opening Card Menu');
          handleOpenCardMenu();
        },
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

  //Assign Card
  const handleOpenCardMenu = async () => {
    console.log('🟡 handleOpenCardMenu called');
    setLoading(true);
    try {
      // Fetch and wait for Redux to finish updating
      const result = await dispatch(
        fetchCardDT({ ...defaultCardFilter, length: 0, filters: { IsUsed: false } }),
      ).unwrap();

      // Log for verification
      console.log('Fetched cards:', result);

      // Optional: verify data is present
      if (result?.collection?.length > 0) {
        console.log('Res', result.collection.data);
        setLocalCardData(result.collection.data || []);
        setOpenCardMenu(true);
      } else {
        toast.error('No available cards found.');
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      toast.error('Failed to load cards.');
    } finally {
      setLoading(false);
    }
  };

  //Tracking History
  const [openTrackHistory, setOpenTrackHistory] = useState(false);

  //Format
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = 0;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `+${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <>
      {visitorDetail && trxVisitorDetail ? (
        <>
          {/* Header Part */}
          <Box
            p={3}
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              borderRadius: '8px',
              boxShadow: 3,
              background:
                chipColor !== 'default'
                  ? `linear-gradient(90deg, ${
                      theme.palette[chipColor].dark ?? theme.palette[chipColor].main
                    } 0%, ${theme.palette[chipColor].main} 100%)`
                  : 'linear-gradient(90deg, #90a4ae 0%, #b0bec5 100%)', // neutral fallback
            }}
          >
            {/* Left side: title + status */}
            <Typography
              variant="h5"
              fontWeight={700}
              color="#fff"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              Visitor Details
            </Typography>

            {/* Right side: Close button */}
            <Tooltip title="Close">
              <IconButton
                onClick={() => dispatch(SelectTrxVisitor(''))}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(0,0,0,0.15)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                  transition: 'all 0.2s ease',
                  '& svg': {
                    color: '#fff',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.35)',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <IconX size="18" stroke={1.6} />
              </IconButton>
            </Tooltip>
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
              sx={{ position: 'relative' }}
            >
              <Avatar
                alt="Visitor Face"
                src={`${BASE_URL}${trxVisitorDetail.visitor?.faceImage}`}
                sx={{ width: 200, height: 200, mb: 2 }}
              />
              <VisitorActions
                trxVisitorDetail={{
                  ...trxVisitorDetail,
                  name: trxVisitorDetail.visitor?.name ?? 'Unknown Visitor',
                }}
                floating
              />

              <Typography variant="h4" fontWeight={800}>
                {trxVisitorDetail.visitor?.name || 'Not provided'}
              </Typography>
              <Button
                variant="contained"
                color="info"
                sx={{ mt: 2 }}
                onClick={() => setOpenTrackHistory(true)}
              >
                Tracking History
              </Button>
            </Box>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Visit Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="arrival">Arrival</CustomFormLabel>
                <Typography>{formatTime(trxVisitorDetail.visitorPeriodStart)}</Typography>

                <CustomFormLabel htmlFor="end">End</CustomFormLabel>
                <Typography>
                  {formatTime(trxVisitorDetail.visitorPeriodEnd)}{' '}
                  {trxVisitorDetail.extendedVisitorTime &&
                    trxVisitorDetail.extendedVisitorTime > 0 && (
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontWeight: 600, ml: 0.5 }}
                      >
                        ({formatDuration(trxVisitorDetail.extendedVisitorTime)})
                      </Typography>
                    )}
                </Typography>
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="accepted">Accepted</CustomFormLabel>
                {trxVisitorDetail.isInvitationAccepted !== undefined ? (
                  <Chip
                    label={trxVisitorDetail.isInvitationAccepted ? 'Accepted' : 'Not Accepted'}
                    color={trxVisitorDetail.isInvitationAccepted ? 'success' : 'error'}
                    variant="filled"
                    sx={{ fontWeight: 600, borderRadius: '6px' }}
                  />
                ) : (
                  <Chip
                    label="Not provided"
                    variant="outlined"
                    color="default"
                    sx={{
                      fontStyle: 'italic',
                      fontWeight: 500,
                      borderRadius: '6px',
                    }}
                  />
                )}
                <CustomFormLabel htmlFor="status">Status</CustomFormLabel>
                <Chip
                  label={trxVisitorDetail.visitor?.isVip ? 'VIP Guest' : 'Normal Guest'}
                  color={trxVisitorDetail.visitor?.isVip ? 'warning' : 'default'}
                  variant="filled"
                  sx={{
                    fontWeight: 600,
                    borderRadius: '6px',
                  }}
                />
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Visitor Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.email || 'Not provided'}</Typography>

                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.address || 'Not provided'}</Typography>

                <CustomFormLabel htmlFor="organization">Organization</CustomFormLabel>
                <Typography>
                  {getOrganizationDisplay(
                    trxVisitorDetail.visitor?.organizationName,
                    trxVisitorDetail.visitor?.departmentName,
                    trxVisitorDetail.visitor?.districtName,
                  ) || 'Not provided'}
                </Typography>
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.phone || 'Not provided'}</Typography>

                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.gender || 'Not provided'}</Typography>
              </Grid>
            </Grid>

            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.personId || 'Not provided'}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{trxVisitorDetail.visitor?.identityId || 'Not provided'}</Typography>
              </Grid>
            </Grid>

            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <Typography>
                  {trxVisitorDetail.visitor?.cardNumber ? 
                  trxVisitorDetail.visitor?.cardNumber : trxVisitorDetail.status === 'Checkout' ?
                  'Card returned' :
                  'Not provided'}
                </Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>
                  {trxVisitorDetail.visitor?.bleCardNumber ? 
                  trxVisitorDetail.visitor?.bleCardNumber : trxVisitorDetail.status === 'Checkout' ?
                  'Card returned' :
                  'Not provided'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      ) : (
        <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
          <Box>
            <Typography variant="h4">Please Select a Visitor</Typography>
            <br />
          </Box>
        </Box>
      )}

      {/* Reason Pop-up */}
      <Dialog open={openReasonMenu} onClose={handleCloseReasonMenu} fullWidth maxWidth="sm">
        <DialogTitle mb={2} p={2}>
          Reason
        </DialogTitle>
        <DialogContent>
          <Grid size={12} p={1}>
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

      {trxVisitorDetail.visitor && (
        <VisitorTrackingHistoryPopup
          open={openTrackHistory}
          onClose={() => setOpenTrackHistory(false)}
          visitor={trxVisitorDetail.visitor}
        />
      )}

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
