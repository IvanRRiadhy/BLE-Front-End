import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Typography } from '@mui/material';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT';
import { AlarmType, RefreshAlarmState } from 'src/store/apps/tracking/Alarm';
// import axios from 'axios';
import { dispatch, useSelector } from 'src/store/Store';

const ALARM_TOPIC = 'alarm/topic';
const deactivateAlarm = 'http://192.168.1.107:3300/deactivate-alarm';

const AlarmPopup: React.FC = () => {
  const [alarm, setAlarm] = useState<AlarmType>({
    beaconId: '',
    pair: '',
    first: '',
    second: '',
    firstDist: 0,
    seconDist: 0,
    jarakPixel: 0,
    jarakMeter: 0,
    point: { x: 0, y: 0 },
    firstReaderCoord: { id: '', x: 0, y: 0 },
    secondReaderCoord: { id: '', x: 0, y: 0 },
    time: '',
    floorplanId: '',
    inRestrictedArea: true,
    is_Active: true,
    floorplanName: '',
    maskedAreaName: '',
  });
  const [open, setOpen] = useState(false);

  const handleClose = async () => {
    console.log(deactivateAlarm, alarm?.beaconId);
    setOpen(false);
    dispatch(RefreshAlarmState());
    // try {
    //   const response = await axios.post(deactivateAlarm, {
    //     dmac: alarm?.beaconId,
    //   });
    //   console.log(response.data);
    // } catch (error) {
    //   console.log(error);
    //   throw error;
    // }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Alarm Triggered!</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          ALERT! Beacon {alarm?.beaconId ?? 'ALARM'} is in area{' '}
          {alarm?.maskedAreaName ?? 'SOMEWHERE'} on {alarm?.floorplanName ?? 'SOMEWHERE'}.
        </Typography>
        <pre>{JSON.stringify(alarm, null, 2)}</pre>
        <Button onClick={handleClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
};

export default AlarmPopup;
