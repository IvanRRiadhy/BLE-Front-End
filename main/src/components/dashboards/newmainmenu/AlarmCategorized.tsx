import { Box, Typography, Divider, Stack } from "@mui/material";

interface AlarmByStatusItem {
  status: string;
  total: number;
}

interface AlarmByAreaItem {
  alarmStatus: string;
  total: number;
}

type PublicData = AlarmByStatusItem[] | AlarmByAreaItem[];

interface PublicProps {
  title: string;
  data: PublicData;
}

const AlarmCategorized: React.FC<PublicProps> = ({ title, data }) => {
const formatTitle = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");
  const isAlarmByStatus = title === "Alarm By Status";
  const isAlarmByArea = title === "Alarm By Area";

  return (
    <Box
      sx={{
        width: "100%",
        height: "14.65vh",
        borderRadius: "25px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        px: 2,
        py: 1,
      }}
    >
      {/* Title */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: "#045498",
            mt: 1,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Divider />

      {/* Content */}
      <Stack
        direction="row"
        spacing={2.5}
        sx={{
          height: 70,
          alignItems: "center",
          justifyContent: isAlarmByStatus ? "flex-start" : "center",
        }}
      >
        {isAlarmByStatus &&
          Array.isArray(data) &&
          data.map((item) => (
            <Box key={(item as AlarmByStatusItem).status}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1f4e79",
                }}
              >
                {formatTitle((item as AlarmByStatusItem).status)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1f4e79",
                    textAlign: "center",
                }}
              >
                {(item as AlarmByStatusItem).total}
              </Typography>
            </Box>
          ))}

        {isAlarmByArea &&
          Array.isArray(data) &&
          data.map((item) => (
            <Box key={(item as AlarmByAreaItem).alarmStatus}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1f4e79",
                }}
              >
                {formatTitle((item as AlarmByAreaItem).alarmStatus)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1f4e79",
                  textAlign: "center",
                }}
              >
                {(item as AlarmByAreaItem).total}
              </Typography>
            </Box>
          ))}
      </Stack>
    </Box>
  );
};

export default AlarmCategorized;
