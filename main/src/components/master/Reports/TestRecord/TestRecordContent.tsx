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
} from '@mui/material';
import { VisitorType } from 'src/store/apps/crud/visitor';
import IconClose from 'src/assets/images/frontend-pages/icons/icon-close.svg';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import {  IconX } from '@tabler/icons-react';
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

const VisitorContent = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const trxVisitorDetail = useSelector(
    (state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor,
  );
  const visitorDetail: VisitorType | undefined = trxVisitorDetail.visitor;
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
              background: 'background.paper',
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
              sx={{ position: 'relative' }} // <-- make this the positioning context
            >
              <Avatar
                alt="Visitor Face"
                src={`${BASE_URL}${trxVisitorDetail.visitor?.faceImage}`}
                sx={{ width: 200, height: 200, mb: 2 }}
              />
              <Typography variant="h4" fontWeight={800}>
                {trxVisitorDetail.visitor?.name}
              </Typography>
            </Box>

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
