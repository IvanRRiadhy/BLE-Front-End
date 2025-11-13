import { BASE_URL } from 'src/utils/axios';
import { useState } from 'react';
import { useSelector, useDispatch } from 'src/store/Store';
import {
  Box,
  Button,
  Typography,
  Avatar,
  Divider,
  Grid2 as Grid,
  Backdrop,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  Chip,
} from '@mui/material';
import { VisitorType } from 'src/store/apps/crud/visitor';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { visitorStatusEnumMap } from 'src/types/crud/input';
import { SelectTrxVisitor } from 'src/store/apps/crud/trxVisitor';
import { createPortal } from 'react-dom';
import VisitorActions from './visitorActions';
import VisitorTrackingHistoryPopup from './VisitorTrackingHistoryPopup';
import { useTrxVisitorDetail } from 'src/hooks/useVisitorTrx';

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
  const dispatch = useDispatch();
  
  // Keep using Redux for selected visitor state
  const trxVisitorDetail = useSelector(
    (state: any) => state.TrxVisitorReducer.SelectedTrxVisitor,
  );
  
  // Use React Query for data fetching with the selected visitor ID
  const { data: freshVisitorData, isLoading, error } = useTrxVisitorDetail(trxVisitorDetail?.id);
  
  // Use fresh data from React Query if available, otherwise fall back to Redux data
  const displayVisitorDetail =  trxVisitorDetail;
  const visitorDetail: VisitorType | undefined = displayVisitorDetail?.visitor;

  // Tracking History
  const [openTrackHistory, setOpenTrackHistory] = useState(false);

  const getOrganizationDisplay = (
    organization?: string,
    department?: string,
    district?: string,
  ) => {
    return [organization, department, district].filter((v) => v && v.trim() !== '').join(' - ');
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
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

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = 0;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `+${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const statusValue = displayVisitorDetail?.status
    ? visitorStatusEnumMap[displayVisitorDetail.status]
    : undefined;
  const chipColor = statusValue !== undefined ? visitorStatusColorMap[statusValue] : 'default';

  // Show loading state only when we have a selected visitor but data is loading
  if (trxVisitorDetail?.id && isLoading) {
    return (
      <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (trxVisitorDetail?.id && error) {
    return (
      <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
        <Typography variant="h4" color="error">
          Error loading visitor details
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {visitorDetail && displayVisitorDetail ? (
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
                  : 'linear-gradient(90deg, #90a4ae 0%, #b0bec5 100%)',
            }}
          >
            <Typography
              variant="h5"
              fontWeight={700}
              color="#fff"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              Visitor Details
            </Typography>

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
                src={`${BASE_URL}${displayVisitorDetail.visitor?.faceImage}`}
                sx={{ width: 200, height: 200, mb: 2 }}
              />
              <VisitorActions
                trxVisitorDetail={{
                  ...displayVisitorDetail,
                  name: displayVisitorDetail.visitor?.name ?? 'Unknown Visitor',
                }}
                floating
              />

              <Typography variant="h4" fontWeight={800}>
                {displayVisitorDetail.visitor?.name || 'Not provided'}
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
                <Typography>{formatTime(displayVisitorDetail.visitorPeriodStart)}</Typography>

                <CustomFormLabel htmlFor="end">End</CustomFormLabel>
                <Typography>
                  {formatTime(displayVisitorDetail.visitorPeriodEnd)}{' '}
                  {displayVisitorDetail.extendedVisitorTime &&
                    displayVisitorDetail.extendedVisitorTime > 0 && (
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontWeight: 600, ml: 0.5 }}
                      >
                        ({formatDuration(displayVisitorDetail.extendedVisitorTime)})
                      </Typography>
                    )}
                </Typography>
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="accepted">Accepted</CustomFormLabel>
                {displayVisitorDetail.isInvitationAccepted !== undefined ? (
                  <Chip
                    label={displayVisitorDetail.isInvitationAccepted ? 'Accepted' : 'Not Accepted'}
                    color={displayVisitorDetail.isInvitationAccepted ? 'success' : 'error'}
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
                  label={displayVisitorDetail.visitor?.isVip ? 'VIP Guest' : 'Normal Guest'}
                  color={displayVisitorDetail.visitor?.isVip ? 'warning' : 'default'}
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
                <Typography>{displayVisitorDetail.visitor?.email || 'Not provided'}</Typography>

                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{displayVisitorDetail.visitor?.address || 'Not provided'}</Typography>

                <CustomFormLabel htmlFor="organization">Organization</CustomFormLabel>
                <Typography>
                  {getOrganizationDisplay(
                    displayVisitorDetail.visitor?.organizationName,
                    displayVisitorDetail.visitor?.departmentName,
                    displayVisitorDetail.visitor?.districtName,
                  ) || 'Not provided'}
                </Typography>
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{displayVisitorDetail.visitor?.phone || 'Not provided'}</Typography>

                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{displayVisitorDetail.visitor?.gender || 'Not provided'}</Typography>
              </Grid>
            </Grid>

            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{displayVisitorDetail.visitor?.personId || 'Not provided'}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{displayVisitorDetail.visitor?.identityId || 'Not provided'}</Typography>
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
                  {displayVisitorDetail.visitor?.cardNumber ? 
                  displayVisitorDetail.visitor?.cardNumber : displayVisitorDetail.status === 'Checkout' ?
                  'Card returned' :
                  'Not provided'}
                </Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>
                  {displayVisitorDetail.visitor?.bleCardNumber ? 
                  displayVisitorDetail.visitor?.bleCardNumber : displayVisitorDetail.status === 'Checkout' ?
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

      {displayVisitorDetail?.visitor && (
        <VisitorTrackingHistoryPopup
          open={openTrackHistory}
          onClose={() => setOpenTrackHistory(false)}
          visitor={displayVisitorDetail.visitor}
        />
      )}

      {isLoading &&
        createPortal(
          <Backdrop
            open={isLoading}
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