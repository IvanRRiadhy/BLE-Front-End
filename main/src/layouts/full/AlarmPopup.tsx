import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Button } from '@mui/material';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT';

const ALARM_TOPIC = "alarm/topic";

const AlarmPopup: React.FC = () => {
  const [alarm, setAlarm] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Subscribe to the MQTT topic
    const unsubscribe = startMQTTclient((data: any) => {
      setAlarm(data);
      setOpen(true);
    }, ALARM_TOPIC);

    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleClose = () => setOpen(false);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Alarm Triggered!</DialogTitle>
      <DialogContent>
        <pre>{JSON.stringify(alarm, null, 2)}</pre>
        <Button onClick={handleClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
};

export default AlarmPopup;