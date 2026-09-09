import { BASE_URL } from 'src/utils/axios';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import {
  IconUser,
  IconId,
  IconBadge,
  IconBuilding,
  IconMapPin,
  IconClock,
  IconCreditCard,
  IconBroadcast,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  setFollowingPerson,
  setFollowingPersons,
  setScreenDisplay,
} from 'src/store/apps/monitoring/layout';
import { publishMQTT } from 'src/store/apps/tracking/MQTT';

import { useState } from 'react';
import CompactTrackingDetailModal from './CompactTrackingDetailModal';

type BeaconDetailPopupProps = {
  dmac?: string;
  bleNumber: string;
  memberDetail?: memberType;
  visitorDetail?: VisitorType;
  securityDetail?: memberType; // Define a proper type if available
  area: string;
  floorplan: string;
  time: string;
  detailDialogOpen: boolean;
  setDetailDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenTrackDetail?: React.Dispatch<React.SetStateAction<boolean>>;
  screenId?: string; // 🆕 use screenId instead of grid/screen
};

type PersonType = 'member' | 'visitor' | 'security' | 'unknown';
const themeConfig = {
  member: {
    color: '#1976d2', // blue
    label: 'Member Detail',
  },
  visitor: {
    color: '#d32f2f', // red
    label: 'Visitor Detail',
  },
  security: {
    color: '#2e7d32', // green
    label: 'Security Detail',
  },
  unknown: {
    color: '#616161',
    label: 'Unknown Person',
  },
};

const BeaconDetailPopup = ({
  dmac,
  bleNumber,
  memberDetail,
  visitorDetail,
  securityDetail,
  area,
  floorplan,
  time,
  detailDialogOpen,
  setDetailDialogOpen,
  setOpenTrackDetail,
  screenId,
}: BeaconDetailPopupProps) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [internalOpenTrackDetail, setInternalOpenTrackDetail] = useState(false);

  const appId = localStorage.getItem('applicationId') || '';
  const personType: PersonType = memberDetail ? 'member' : visitorDetail ? 'visitor' : 'security';

  const personDetail = memberDetail || visitorDetail || securityDetail;

  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const activeLayout = useSelector((state: RootState) =>
    state.layoutReducer.layouts.find((l) => l.id === state.layoutReducer.activeLayoutId),
  );
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  const currentPersonId = memberDetail?.id || visitorDetail?.id || securityDetail?.id;
  const currentName = memberDetail?.name || visitorDetail?.name || 'Unknown';
  const isFollowingCurrent = followingPerson?.id === currentPersonId;
  const handleClose = () => {
    setDetailDialogOpen(false);
    dispatch(SetSelectedBeacon({ active: false, sourceScreenid: null }));
  };

  const handleTrackingDetailsClick = () => {
    if (setOpenTrackDetail) {
      setOpenTrackDetail(true);
    } else {
      setInternalOpenTrackDetail(true);
    }
  };

  const theme = themeConfig[personType];

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  const handleFollowOnThisScreen = () => {
    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) {
      console.warn('No screens available in active layout.');
      return;
    }

    const topic = `people_tracking/${appId.toUpperCase()}/highlight/card/${bleNumber}`;
    const payload = 'Start';

    publishMQTT(topic, payload);
    console.log(
      `Published Start message to ${topic} for beacon ${bleNumber} → screen ${firstScreen.id}`,
    );

    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 3, // Follow Mode
          displayOutput: bleNumber, // DMAC of beacon
        },
      }),
    );

    handleClose();
  };

  const handleFollow = () => {
    if (!activeLayoutId || !activeLayout) return;
    if (!currentPersonId) return;

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) return;

    publishMQTT(`people_tracking/${appId.toUpperCase()}/highlight/card/${bleNumber}`, 'Start');

    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 3,
          displayOutput: bleNumber,
        },
      }),
    );

    dispatch(
      setFollowingPerson({
        id: currentPersonId,
        name: currentName,
        bleCardNumber: bleNumber,
        type: personType,
      }),
    );

    handleClose();
  };

  const followingPersons = useSelector(
    (state: RootState) => state.layoutReducer.followingPersons ?? [],
  );

  const handleCancelFollowing = () => {
    if (!activeLayoutId || !activeLayout) return;

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) return;

    const peopleToStop =
      followingPersons.length > 0
        ? followingPersons
        : followingPerson
        ? [followingPerson]
        : [];
    peopleToStop.forEach((person) => {
      if (person.bleCardNumber) {
        publishMQTT(
          `people_tracking/${appId.toUpperCase()}/highlight/card/${person.bleCardNumber}`,
          'Stop',
        );
      }
    });

    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 0,
          displayOutput: '',
        },
      }),
    );

    dispatch(setFollowingPerson(null));
    dispatch(setFollowingPersons([]));

    handleClose();
  };

  const isDisabled = followingPerson && followingPerson.id !== currentPersonId;
  const buttonLabel = isFollowingCurrent ? 'Cancel Following' : 'Follow';
  const handleAction = isFollowingCurrent ? handleCancelFollowing : handleFollow;

  return (
    <>
      <Dialog fullWidth maxWidth={'md'} open={detailDialogOpen} onClose={handleClose}>
        <DialogTitle>
          <Typography
            component="div"
            variant="h4"
            mb={2}
            mt={2}
            fontWeight={700}
            sx={{ color: theme.color }}
          >
            {theme.label}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Avatar Section */}
            <Grid size={12} display={'flex'} justifyContent={'center'} my={1}>
              <Avatar
                alt="Profile"
                src={`${BASE_URL}${personDetail?.faceImage}`}
                sx={{
                  width: '120px',
                  height: '120px',
                  border: `3px solid ${theme.color}`,
                  boxShadow: (theme) => theme.shadows[3],
                }}
              />
            </Grid>

            {/* Details Form Grid */}
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <IconUser size={18} color={theme.color} />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                  Name:
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {personDetail?.name || 'Unknown Person'}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {personType !== 'visitor' && (
                <Box display="flex" alignItems="center" gap={1.5}>
                  <IconId size={18} color={theme.color} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                    NIK :
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {memberDetail?.personId || securityDetail?.personId || '-'}
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <Box display="flex" alignItems="center" gap={1.5}>
                  <IconBadge size={18} color={theme.color} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                    Status :
                  </Typography>
                  <Chip
                    label={visitorDetail.isVip ? 'VIP' : 'Regular'}
                    size="small"
                    color={visitorDetail.isVip ? 'error' : 'default'}
                    sx={{ fontWeight: 600, height: 22 }}
                  />
                </Box>
              )}
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {personType !== 'visitor' && (
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <IconBuilding size={18} color={theme.color} style={{ marginTop: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                    Organization :
                  </Typography>
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {memberDetail?.organization?.name ||
                        securityDetail?.organization?.name ||
                        'Unknown Organization'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {personType !== 'visitor' && (
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <IconUser size={18} color={theme.color} style={{ marginTop: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                    Head Member :
                  </Typography>
                  <Box>
                    <Typography variant="body2" fontWeight={500} color="text.primary">
                      1. {memberDetail?.headMember1 || securityDetail?.headMember1 || '-'}
                    </Typography>
                    {(memberDetail?.headMember2 || securityDetail?.headMember2) && (
                      <Typography variant="body2" fontWeight={500} color="text.primary">
                        2. {memberDetail?.headMember2 || securityDetail?.headMember2}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <IconMapPin size={18} color={theme.color} />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                  Area :
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {area} | {floorplan}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <IconClock size={18} color={theme.color} />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                  Last Seen :
                </Typography>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {formatDate(time)}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <IconCreditCard size={18} color={theme.color} />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                  Card Number :
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {personDetail?.cardNumber || '-'}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <IconBroadcast size={18} color={theme.color} />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                  BLE Card :
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {bleNumber}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        <DialogActions
          sx={{
            p: 2,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
            gap: 1.5,
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            disableElevation
            onClick={handleTrackingDetailsClick}
            disabled={personType === 'security'}
            sx={{ borderRadius: '8px', flex: 1 }}
          >
            Tracking Details
          </Button>

          <Button
            variant="contained"
            color={isFollowingCurrent ? 'error' : 'primary'}
            disableElevation
            onClick={handleAction}
            disabled={isDisabled !== null ? isDisabled : false}
            sx={{ borderRadius: '8px', flex: 1 }}
          >
            {buttonLabel}
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            onClick={handleClose}
            sx={{ borderRadius: '8px', flex: 1 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <CompactTrackingDetailModal
        open={internalOpenTrackDetail}
        onClose={() => setInternalOpenTrackDetail(false)}
        personId={currentPersonId}
        personName={personDetail?.name}
        personType={personType}
        faceImage={personDetail?.faceImage}
        bleNumber={bleNumber}
        cardNumber={personDetail?.cardNumber}
      />
    </>
  );
};

export default BeaconDetailPopup;
