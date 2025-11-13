import React, { useEffect } from 'react';
import { Dialog, Box, Button, Typography } from '@mui/material';
import axiosServices from 'src/utils/axios';
import { useDispatch, useSelector } from 'src/store/Store';
import { fetchAlarmTriggerDT } from 'src/store/apps/crud/alarmTrigger';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import { RootState } from 'src/store/Store';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';

const deactivateAlarm = 'http://192.168.1.1167:3300/deactivate-alarm';

const dataTableFilter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: '',
  sortDir: 'asc',
  SearchValue: '',
};

interface AlarmPopupProps {
  alarm: AlarmType | null;
  open: boolean;
  onClose: () => void;
}

const AlarmPopup: React.FC<AlarmPopupProps> = ({ alarm, open, onClose }) => {
  const dispatch = useDispatch();
  const memberList: memberType[] = useSelector((s: RootState) => s.memberReducer.members);
  const visitorList: VisitorType[] = useSelector((s: RootState) => s.visitorReducer.visitors);

  useEffect(() => {
    console.log('Alarm: ', alarm);
  }, [alarm]);

  // Resolve display name from beacon/card ID
  const getName = (bleNumber: string) => {
    // console.log("bleNumber: ",bleNumber);
    const m = memberList.find((x) => x.bleCardNumber === bleNumber);
    if (m) return m.name;
    const v = visitorList.find((x) => x.bleCardNumber === bleNumber);
    if (v) return v.name;
    return bleNumber || 'Unknown';
  };

  const handleClose = async () => {
    if (alarm?.beaconId) {
      try {
        const response = await axiosServices.post(deactivateAlarm, {
          dmac: alarm.beaconId,
        });
        console.log('Deactivate response:', response.data);
        dispatch(fetchAlarmTriggerDT(dataTableFilter)); // Refresh alarms after deactivation
      } catch (error) {
        console.error('Error deactivating alarm:', error);
      }
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
        },
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(to bottom, #c62828, #b71c1c)',
          color: 'white',
          borderRadius: 4,
          px: 6,
          pt: 4,
          pb: 8,
          minWidth: { xs: '90vw', sm: 480, md: 600 },
          maxWidth: '90vw',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Typography variant="h2" fontWeight="bold" letterSpacing={3} mb={2}>
          ALARM TRIGGERED
        </Typography>

        <Box
          sx={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'inline-block',
            px: 3,
            py: 1,
            borderRadius: '24px',
            mb: 2,
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          🔔 Triggered by{' '}
          <Box component="span" fontWeight="bold" fontSize="1.125rem">
            {getName(alarm?.beaconId || '')}
          </Box>
        </Box>

        <Typography variant="h6" mb={3}>
          Card ID:{' '}
          <Box component="span" fontWeight="bold" fontSize="1.1rem">
            {alarm?.beaconId || 'Unknown'}
          </Box>
        </Typography>
        <Typography variant="h6" mb={3}>
          Area:{' '}
          <Box component="span" fontWeight="bold" fontSize="1.1rem">
            {alarm?.maskedAreaName || 'Unknown'}
          </Box>{' '}
          |{' '}
          <Box component="span" fontWeight="bold" fontSize="1.1rem">
            {alarm?.floorplanName || 'Unknown'}
          </Box>
        </Typography>

        <Box
          sx={{
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            borderRadius: '40px',
            px: 5,
            py: 1.5,
            boxShadow: 2,
          }}
        >
          <Button
            onClick={handleClose}
            variant="text"
            sx={{
              backgroundColor: '#fff',
              color: 'red',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              textTransform: 'none',
              borderRadius: '20px',
              px: 5,
              '&:hover': {
                backgroundColor: '#b71c1c',
                color: 'white',
              },
            }}
          >
            Disarm
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default AlarmPopup;
