import { Avatar, Box, Typography } from "@mui/material";
import { SecurityAlarmLogItem } from "./AlarmInvestigation";

interface AcceptedAlarmViewProps {
  alarm: SecurityAlarmLogItem;
}

const AcceptedAlarm = ({ alarm }: AcceptedAlarmViewProps) => {
  return (
    <Box
      sx={{
        p: 3,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontSize: 20,
          fontWeight: 700,
          color: 'error.main',
          mb: 2,
        }}
      >
        Investigation In Progress
      </Typography>

      <Avatar
        src={alarm.image}
        sx={{ width: 100, height: 100, margin: '0 auto', mb: 2 }}
      />

      <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
        {alarm.name}
      </Typography>

      <Typography sx={{ fontSize: 14, mt: 1 }}>
        {alarm.buildingName} | {alarm.floorName}
      </Typography>

      <Typography sx={{ fontSize: 12, mt: 2 }}>
        Triggered at: {alarm.triggerTime}
      </Typography>

      <Typography sx={{ mt: 3, fontSize: 12, color: 'text.secondary' }}>
        (Detailed investigation screen coming soon)
      </Typography>
    </Box>
  );
};

export default AcceptedAlarm;