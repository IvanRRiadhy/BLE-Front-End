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
import { publishMQTT, startMQTTclient } from 'src/store/apps/tracking/MQTT'; // ✅ use your existing MQTT file

type BeaconDetailPopupProps = {
  dmac?: string;
  bleNumber: string;
  memberDetail?: memberType;
  visitorDetail?: VisitorType;
  area: string;
  floorplan: string;
  time: string;
  detailDialogOpen: boolean;
  setDetailDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenTrackDetail: React.Dispatch<React.SetStateAction<boolean>>;
  screenId?: string; // 🆕 use screenId instead of grid/screen
};

const BeaconDetailPopup = ({
  dmac,
  bleNumber,
  memberDetail,
  visitorDetail,
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
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const activeLayout = useSelector((state: RootState) =>
    state.layoutReducer.layouts.find((l) => l.id === state.layoutReducer.activeLayoutId),
  );

  const handleClose = () => {
    setDetailDialogOpen(false);
    dispatch(SetSelectedBeacon({ active: false, sourceScreenid: null }));
  };

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
    `Published Start message to ${topic} for beacon ${bleNumber} → screen ${firstScreen.id}`
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


  return (
    <Dialog fullWidth maxWidth={'md'} open={detailDialogOpen} onClose={handleClose}>
      <DialogTitle>
        <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
          {memberDetail ? 'Member Detail' : visitorDetail ? 'Visitor Detail' : 'Unknown Person'}
        </Typography>
        <Divider />
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} mb={2} p={2}>
          <Grid container size={12} direction={'row'} mb={2}>
            <Grid size={12} display={'flex'} justifyContent={'center'} position="relative">
              <Avatar
                alt="Member Profile"
                src={`${BASE_URL}${
                  memberDetail ? memberDetail.faceImage : visitorDetail?.faceImage
                }`}
                sx={{ width: '128px', height: '128px', ml: 2 }}
              />
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleFollowOnThisScreen}
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderRadius: 2,
                  minWidth: 0,
                  px: 2,
                  py: 1,
                }}
              >
                Follow
              </Button>
            </Grid>
          </Grid>

          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Name :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.name
                    : visitorDetail
                    ? visitorDetail.name
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Phone :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.phone
                    : visitorDetail
                    ? visitorDetail.phone
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Email :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.email
                    : visitorDetail
                    ? visitorDetail.email
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Address :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.address
                    : visitorDetail
                    ? visitorDetail.address
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Gender :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.gender
                    : visitorDetail
                    ? visitorDetail.gender
                    : 'Unknown Person'}
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
              {memberDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Organization :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {memberDetail.organization?.name || 'Unknown Organization'}
                    </Box>
                    <br />
                    <Box
                      component="span"
                      typography={{ fontSize: '12px', fontWeight: '400' }}
                      sx={{ display: 'inline-block', ml: 'calc(1ch * 13)' }} // aligns after "Organization :"
                    >
                      {memberDetail.department?.name || 'Unknown Department'} |{' '}
                      {memberDetail.district?.name || 'Unknown District'}
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
              {memberDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Head Member :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      1. {memberDetail.headMember1}
                    </Box>
                    <br />
                    {memberDetail.headMember2 && memberDetail.headMember2 !== '' && (
                      <Box
                        component="span"
                        typography={{ fontSize: '14px', fontWeight: '500' }}
                        sx={{ display: 'inline-block', ml: 'calc(1ch * 12)' }} // aligns after "Organization :"
                      >
                        2. {memberDetail.headMember2}
                      </Box>
                    )}
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
                  {memberDetail
                    ? memberDetail.cardNumber
                    : visitorDetail
                    ? visitorDetail.cardNumber
                    : 'Unknown Person'}
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
          justifyContent: 'space-between',
          px: 0,
          py: 0,
          zIndex: 1,
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
