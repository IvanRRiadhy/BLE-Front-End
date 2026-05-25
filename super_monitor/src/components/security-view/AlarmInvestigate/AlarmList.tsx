import { Avatar, Box, Stack, Typography } from "@mui/material";
import { SecurityAlarmLogItem } from "./AlarmInvestigation";
import SmartScrollingText from "src/utils/SmartScrollingText";

interface AlarmTriggerListViewProps {
  data: SecurityAlarmLogItem[];
  onAccept: (alarm: SecurityAlarmLogItem) => void;
}

const AlarmList = ({
  data,
  onAccept,
}: AlarmTriggerListViewProps) => {
  return (
    <>
      {data.map((item, index) => (
        <Stack
          key={item.id}
          direction="row"
          spacing={2}
          alignItems="center"
          onClick={() => onAccept(item)}
          sx={{
            p: 1,
            backgroundColor: index % 2 !== 0 ? 'grey.50' : 'background.default',
            borderBottom: '1px solid #e0e0e0',
            width: '100%',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          <Avatar src={item.image} sx={{ width: 56, height: 56 }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SmartScrollingText
              text={item.name}
              sx={{ fontSize: 16, fontWeight: 600, color: 'primary.main' }}
            />
            <SmartScrollingText
              text={`${item.buildingName} | ${item.floorName}`}
              sx={{ fontSize: 12, color: 'primary.main' }}
            />
            <Typography sx={{ fontSize: 12, color: 'primary.main' }}>
              {item.triggerTime}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: item.color,
              }}
            >
              {item.status}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'primary.main' }}>
              {item.secondGateway}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'primary.main' }}>
              {item.lastSeenTime}
            </Typography>
          </Box>
        </Stack>
      ))}
    </>
  );
};

export default AlarmList;