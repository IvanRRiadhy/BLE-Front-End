import React, { useEffect, useState } from 'react';
import { Typography, Box, useMediaQuery, Theme, FormLabel, Chip } from '@mui/material';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { useSelector, useDispatch, AppDispatch, RootState } from 'src/store/Store';
import { alpha, useTheme } from '@mui/material/styles';
import { fetchTrackingTrans, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useTranslation } from 'react-i18next';

type AlarmStateType = trackingTransType & { isRead: boolean };

const drawerWidth = 260;

const AlarmList: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const alarmData: trackingTransType[] = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const [alarmState, setAlarmState] = useState<AlarmStateType[]>([]);
  const readerData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const floorplanData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);

  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchTrackingTrans());
    dispatch(fetchBleReaders());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);

  useEffect(() => {
    setAlarmState(alarmData.map((alarm) => ({ ...alarm, isRead: false })));
  }, [alarmData]);

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

  const getReaderName = (readerId: string) => {
    const reader = readerData.find((rd: bleReaderType) => rd.id === readerId);
    return reader ? reader.name : 'Unknown Reader';
  };

  const getFloorName = (floorId: string) => {
    const floor = floorplanData.find((fl: MaskedAreaType) => fl.id === floorId);
    return floor ? floor.name : 'Unknown Floor';
  };

  const handleMouseEnter = (id: string) => {
    setAlarmState((prevState) =>
      prevState.map((alarm) => (alarm.id === id ? { ...alarm, isRead: true } : alarm)),
    );
  };

  return (
    <Box>
      <Box
        p={3}
        sx={{
          backgroundColor: 'error.light',
        }}
      >
        <FormLabel htmlFor="outlined-multiline-static">
          <Typography variant="h3" mb={1} fontWeight={800} sx={{ color: 'error.dark' }}>
            Alarms
          </Typography>
        </FormLabel>
      </Box>
      {alarmData.length > 0 ? (
        <Scrollbar
          sx={{
            width: drawerWidth,
            height: 'calc(100vh - 250px)',
            maxHeight: '100%',
            flexShrink: 0,
            zIndex: lgUp ? 0 : 1,
            display: 'flex',
            flexDirection: 'column',
            [`& .MuiDrawer-paper`]: {
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',

              overflowY: 'auto',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            {alarmState.map((alarm) => (
              <>
                <Box
                  key={alarm.id}
                  onMouseEnter={() => handleMouseEnter(alarm.id)}
                  sx={{
                    backgroundColor: alarm.isRead ? 'transparent' : 'error.light',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    transition: 'background-color 0.3s ease-in-out',
                  }}
                >
                  <Box
                    key={alarm.id}
                    mb={0.5}
                    sx={{
                      p: 1,
                      backgroundColor: alarm.isRead ? 'primary.light' : 'transparent',
                      mr: 'auto',
                      width: alarm.isRead ? '100%' : '80%',
                      maxWidth: '320px',
                      transition: 'background-color 0.3s ease-in-out',
                    }}
                  >
                    {`Visitor ${getReaderName(alarm.readerId)} found passing through ${getFloorName(
                      alarm.floorplanId,
                    )} which are not allowed to pass.`}
                  </Box>
                  {!alarm.isRead && (
                    <Chip label="Unread" color="warning" size="small" sx={{ mr: 1, mt: 1 }} />
                  )}
                </Box>
                {alarm.transTime ? (
                  <Typography variant="body2" color="grey.400" mb={2} ml={1}>
                    {formatTime(alarm.transTime)}
                  </Typography>
                ) : null}
              </>
            ))}
          </Box>
        </Scrollbar>
      ) : null}
    </Box>
  );
};

export default AlarmList;
