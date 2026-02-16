import { Box, Typography, Divider, Stack, Grid2 as Grid } from '@mui/material';

interface AlarmByStatusItem {
  status: string;
  total: number;
}

interface AlarmByAreaItem {
  areaName: string;
  total: number;
}

type PublicData = AlarmByStatusItem[] | AlarmByAreaItem[];

interface PublicProps {
  title: string;
  data: PublicData;
}

const AlarmCategorized: React.FC<PublicProps> = ({ title, data }) => {
  const formatTitle = (value: string) => {
    // console.log('VALUE: ', value);
    if (!value) return '-';
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  };
  const isAlarmByStatus = title === 'Alarm By Status';
  const isAlarmByArea = title === 'Alarm By Area';
  console.log('TITLE: ', data);
  return (
    <Box
      sx={{
        width: '100%',
        height: '14.65vh',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        px: 3,
        py: 2,
      }}
    >
      {/* Title */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: '#045498',
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
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {isAlarmByStatus &&
          Array.isArray(data) &&
          data.length > 0 &&
          data.map((item) => (
            <Box key={(item as AlarmByStatusItem).status}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1f4e79',
                  maxWidth: 120,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formatTitle((item as AlarmByStatusItem).status)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1f4e79',
                  textAlign: 'center',
                }}
              >
                {(item as AlarmByStatusItem).total}
              </Typography>
            </Box>
          ))}

        {isAlarmByArea &&
          Array.isArray(data) &&
          data.map((item) => (
            <Box key={(item as AlarmByAreaItem).areaName}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1f4e79',
                  maxWidth: 100,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  my: 0.5,
                }}
              >
                {formatTitle((item as AlarmByAreaItem).areaName)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1f4e79',
                  textAlign: 'center',
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
