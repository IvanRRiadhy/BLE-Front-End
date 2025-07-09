import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Typography } from '@mui/material';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT';
import axiosServices from 'src/utils/axios';
import { data } from 'react-router';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import axios from 'axios';

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

  useEffect(() => {
    // Subscribe to the MQTT topic
    const unsubscribe = startMQTTclient((data: AlarmType | AlarmType[]) => {
      const parsed = Array.isArray(data) ? data[0] : data;
      setAlarm(parsed);
      setOpen(true);
      // console.log('parsed : ', parsed);
    }, ALARM_TOPIC);
    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleClose = async () => {
    console.log(deactivateAlarm, alarm?.beaconId);

    try {
      const response = await axios.post(deactivateAlarm,{
        dmac: alarm?.beaconId,
      });
      console.log(response.data);
          setOpen(false);
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Alarm Triggered!</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          ALERT! Beacon {alarm?.beaconId} is in area {alarm?.maskedAreaName} on {alarm?.floorplanName}.
        </Typography>
        <pre>{JSON.stringify(alarm, null, 2)}</pre>
        <Button onClick={handleClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
};

export default AlarmPopup;
