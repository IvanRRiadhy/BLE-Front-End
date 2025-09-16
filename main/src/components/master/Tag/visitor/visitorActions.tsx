import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid2 as Grid,
  MenuItem,
  Stack,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import toast from 'react-hot-toast';

import { AppDispatch, RootState } from 'src/store/Store';
import {
  fetchTrxVisitorDT,
  SelectTrxVisitor,
  UpdateFilter,
  visitorCheckIn,
  visitorCheckOut,
  visitorStatusChange,
} from 'src/store/apps/crud/trxVisitor';
import { defaultCardFilter, defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import { fetchCardDT, CardType } from 'src/store/apps/crud/card';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { createPortal } from 'react-dom';

// Minimal type that this component needs
type TrxVisitorDetailLike = {
  id: string;
  status: 'Preregist' | 'Precheckin' | 'Checkin' | 'Unblock' | 'Block' | string;
};

type Props = {
  trxVisitorDetail: TrxVisitorDetailLike;
  /** Optional: set true if you want the actions to render absolute at top-left when wrapped in a relative parent */
  floating?: boolean;
};

const VisitorActions = ({ trxVisitorDetail, floating = true }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const cardData = useSelector((state: RootState) => state.CardReducer.cards);
  const filteredCard = cardData.filter((card) => card.isUsed === false);
  const [loading, setLoading] = useState(false);
  const [openReasonMenu, setOpenReasonMenu] = useState(false);
  const [openCardMenu, setOpenCardMenu] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedCard, setSelectedCard] = useState<string>('');

  // Preload available cards (unused) whenever the card dialog is needed
  useEffect(() => {
    dispatch(fetchCardDT({ ...defaultCardFilter, length: 0, fiters: { IsUsed: false } }));
  }, [dispatch]);

  const refreshAndReselect = async () => {
    dispatch(UpdateFilter(defaultTrxVisitorFilter));
    await dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
    dispatch(SelectTrxVisitor(trxVisitorDetail.id));
  };

  const handleCheckin = async () => {
    setLoading(true);
    if (!trxVisitorDetail?.id) {
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
      if (result && (result as any).type?.endsWith('/fulfilled')) {
        toast.success('Visitor checked in successfully');
        await refreshAndReselect();
        setOpenCardMenu(false);
        setSelectedCard('');
      } else {
        toast.error('Error checking in visitor');
      }
    } catch (error) {
      console.error('Error checking in visitor:', error);
      toast.error('Error checking in visitor');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    if (!trxVisitorDetail?.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(visitorCheckOut(trxVisitorDetail.id));
      if (result && (result as any).type?.endsWith('/fulfilled')) {
        toast.success('Visitor checked out successfully');
        await refreshAndReselect();
      } else {
        toast.error('Error checking out visitor');
      }
    } catch (error) {
      console.error('Error checking out visitor:', error);
      toast.error('Error checking out visitor');
    } finally {
      setLoading(false);
    }
  };

  const doStatusChange = async (status: 'denied' | 'blocked' | 'unblocked') => {
    setLoading(true);
    if (!trxVisitorDetail?.id) {
      setLoading(false);
      toast.error('Visitor not found');
      return;
    }
    try {
      const result = await dispatch(
        visitorStatusChange({ trxVisitorId: trxVisitorDetail.id, status }),
      );
      if (result && (result as any).type?.endsWith('/fulfilled')) {
        toast.success(
          status === 'denied'
            ? 'Visitor denied successfully'
            : status === 'blocked'
            ? 'Visitor blocked successfully'
            : 'Visitor unblocked successfully',
        );
        await refreshAndReselect();
      } else {
        toast.error('Error updating visitor status');
      }
    } catch (error) {
      console.error('Error updating visitor status:', error);
      toast.error('Error updating visitor status');
    } finally {
      setLoading(false);
      setOpenReasonMenu(false);
      setReason('');
    }
  };

  const handleDeny = () => doStatusChange('denied');
  const handleBlock = () => doStatusChange('blocked');
  const handleUnblock = () => doStatusChange('unblocked');

  const handleConfirmReason = () => {
    // If status currently 'Checkin', it's a Block flow; otherwise Deny flow
    if (trxVisitorDetail.status === 'Checkin') handleBlock();
    else handleDeny();
  };

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
          dispatch(fetchCardDT({ ...defaultCardFilter, length: 0, fiters: { IsUsed: false } }));
          setOpenCardMenu(true);
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
      secondary: { label: 'Unblock Visitor', color: 'success', onClick: handleUnblock },
    },
  };

  const currentActions = trxVisitorDetail?.status ? actionMap[trxVisitorDetail.status] : undefined;

  return (
    <>
      {/* Buttons */}
      {currentActions && (
        <Box
          sx={{
            position: { xs: 'static', md: floating ? 'absolute' : 'static' },
            top: { md: 0 },
            left: { md: 0 },
            zIndex: 2,
          }}
        >
          <Stack spacing={1} direction="column" alignItems="flex-start">
            {currentActions.primary && (
              <Button
                size="large"
                variant="contained"
                color={currentActions.primary.color}
                onClick={currentActions.primary.onClick}
                sx={{ boxShadow: 2, width: "12vw", height: 50 }}
              >
                {currentActions.primary.label}
              </Button>
            )}
            {currentActions.secondary && (
              <Button
                size="large"
                variant="contained"
                color={currentActions.secondary.color}
                onClick={currentActions.secondary.onClick}
                sx={{ boxShadow: 2, width: "12vw", height: 50 }}
              >
                {currentActions.secondary.label}
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Card Assign Dialog */}
      <Dialog open={openCardMenu} onClose={() => setOpenCardMenu(false)} fullWidth maxWidth="sm">
        <DialogTitle mb={2} p={2}>
          Assign Card
        </DialogTitle>
        <DialogContent>
          <Grid size={12}  p={1}>
            <CustomSelect
              name="selectedCard"
              value={selectedCard || ''}
              onChange={(e: any) => setSelectedCard(e.target.value)}
              fullWidth
              variant="outlined"
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200,
                    width: 100,
                  },
                },
              }}
            >
              <MenuItem value="" disabled>
                Select Card to Assign
              </MenuItem>
              {filteredCard.map((card: CardType) => (
                <MenuItem key={card.id} value={card.id}>
                  {card.name} | {card.cardNumber}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCardMenu(false)} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleCheckin} color="primary">
            Assign Card
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reason Dialog */}
      <Dialog
        open={openReasonMenu}
        onClose={() => setOpenReasonMenu(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle mb={2} p={2}>
          Reason
        </DialogTitle>
        <DialogContent>
          <Grid size={12}  p={1}>
            <CustomTextField
              id="reason"
              label="Reason"
              multiline
              fullWidth
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
            />
          </Grid>
          <DialogContentText sx={{ px: 1, pt: 1, color: 'text.secondary' }}>
            This note will be saved in the visitor’s status history (optional).
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReasonMenu(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmReason} color="error">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Local loading overlay */}
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

export default VisitorActions;
