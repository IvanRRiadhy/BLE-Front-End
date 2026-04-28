import { BASE_URL } from 'src/utils/axios';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { setScreenDisplay } from 'src/store/apps/monitoring/layout';
import { publishMQTT, startMQTTclient } from 'src/store/apps/tracking/MQTT';
import { setFollowingPerson } from 'src/store/apps/monitoring/layout';

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
  setOpenTrackDetail: React.Dispatch<React.SetStateAction<boolean>>;
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

    // 🟢 Always use the FIRST screen of the active layout
    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) {
      console.warn('No screens available in active layout.');
      return;
    }

    const topic = `highlight/card/${bleNumber}`;
    const payload = 'Start';

    // ✅ Publish Start via shared MQTT client
    publishMQTT(topic, payload);
    console.log(
      `Published Start message to ${topic} for beacon ${bleNumber} → screen ${firstScreen.id}`,
    );

    // ✅ Switch first screen into Follow Mode
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

    publishMQTT(`highlight/card/${bleNumber}`, 'Start');

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

  const handleCancelFollowing = () => {
    if (!activeLayoutId || !activeLayout) return;

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) return;

    if (followingPerson?.bleCardNumber) {
      publishMQTT(`highlight/card/${followingPerson.bleCardNumber}`, 'Stop');
    }

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

    handleClose();
  };
  const isDisabled = followingPerson && followingPerson.id !== currentPersonId;
  const buttonLabel = isFollowingCurrent ? 'Cancel Following' : 'Follow';
  const handleAction = isFollowingCurrent ? handleCancelFollowing : handleFollow;

  return (
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

      <DialogContent>
        <Grid container spacing={3} mb={2} p={2}>
          <Grid container size={12} direction={'row'} mb={2}>
            <Grid size={12} display={'flex'} justifyContent={'center'} position="relative">
              <Avatar
                alt="Profile"
                src={`${BASE_URL}${personDetail?.faceImage}`}
                sx={{
                  width: '128px',
                  height: '128px',
                  ml: 2,
                  border: `4px solid ${theme.color}`,
                }}
              />
            </Grid>
          </Grid>

          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Name :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {personDetail?.name || 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Phone :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {personDetail?.phone || 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Email :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {personDetail?.email || 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Address :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {personDetail?.address || 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Gender :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {personDetail?.gender || 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {memberDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Status :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {memberDetail.statusEmployee}
                    </Box>
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Status :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {visitorDetail.isVip ? 'VIP' : 'Regular'}
                    </Box>
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {personType !== 'visitor' && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Organization :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {memberDetail?.organization?.name ||
                        securityDetail?.organization?.name ||
                        'Unknown Organization'}
                    </Box>
                    <br />
                    <Box
                      component="span"
                      typography={{ fontSize: '12px', fontWeight: '400' }}
                      sx={{ display: 'inline-block', ml: 'calc(1ch * 13)' }} // aligns after "Organization :"
                    >
                      {memberDetail?.organization?.name ||
                        securityDetail?.organization?.name ||
                        'Unknown Department'}{' '}
                      |{' '}
                      {memberDetail?.organization?.name ||
                        securityDetail?.organization?.name ||
                        'Unknown District'}
                    </Box>
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Visit Arrival :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {/* {visitorDetail.visitorPeriodStart} */}
                    </Box>
                  </Typography>
                </>
              )}
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {personType !== 'visitor' && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Head Member :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      1. {memberDetail?.headMember1 || securityDetail?.headMember1}
                    </Box>
                    <br />
                    {(memberDetail?.headMember2 && memberDetail.headMember2 !== '') ||
                      (securityDetail?.headMember2 && securityDetail.headMember2 !== '' && (
                        <Box
                          component="span"
                          typography={{ fontSize: '14px', fontWeight: '500' }}
                          sx={{ display: 'inline-block', ml: 'calc(1ch * 12)' }} // aligns after "Organization :"
                        >
                          2. {memberDetail?.headMember2 || securityDetail?.headMember2}
                        </Box>
                      ))}
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Visit End :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {/* {visitorDetail.visitorPeriodEnd} */}
                    </Box>
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Area :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {area} | {floorplan}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Last Seen :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {formatDate(time)}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Card Number :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {personDetail?.cardNumber || '-'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">BLE Card Number :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {bleNumber}
                </Box>
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          px: 0,
          py: 0,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setOpenTrackDetail(true)}
            sx={{
              width: '100%',
              height: '64px',
              borderRadius: 0,
            }}
          >
            Tracking Details
          </Button>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Button
            variant="contained"
            color={isFollowingCurrent ? 'error' : 'primary'}
            onClick={handleAction}
            disabled={isDisabled !== null ? isDisabled : false} // Set to false if isDisabled is null
            sx={{
              width: '100%',
              height: '64px',
              borderRadius: 0,
            }}
          >
            {buttonLabel}
          </Button>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClose}
            sx={{
              width: '100%',
              height: '64px',
              borderRadius: 0,
            }}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default BeaconDetailPopup;
