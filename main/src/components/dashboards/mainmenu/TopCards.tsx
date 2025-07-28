import { Box, CardContent, Grid2 as Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import icon1 from '../../../assets/images/svgs/icon-pin-inactive.svg';
import icon2 from '../../../assets/images/svgs/icon-pin-active.svg';
import icon3 from '../../../assets/images/svgs/icon-antena.svg';
import icon4 from '../../../assets/images/svgs/icon-box2.svg';
import icon5 from '../../../assets/images/svgs/icon-block.svg';
import icon6 from '../../../assets/images/svgs/icon-exclamation.svg';

interface cardType {
  icon: string;
  title: string;
  digits: string;
  bgcolor: string;
}

const topcards: cardType[] = [
  {
    icon: icon2,
    title: 'Active Beacon',
    digits: '102',
    bgcolor: 'success',
  },
  {
    icon: icon3,
    title: 'Active Gateway',
    digits: '3,650',
    bgcolor: 'secondary',
  },
  {
    icon: icon4,
    title: 'Area',
    digits: '356',
    bgcolor: 'primary',
  },
  {
    icon: icon5,
    title: 'Blacklist',
    digits: '696',
    bgcolor: 'error',
  },
  {
    icon: icon6,
    title: 'Alarm',
    digits: '$96k',
    bgcolor: 'warning',
  },
  {
    icon: icon1,
    title: 'Non-Active Beacon',
    digits: '59',
    bgcolor: 'info',
  },
];

interface TopCardsProps {
  ActiveBeaconCount: number;
  ActiveGatewayCount: number;
  AreaCount: number;
  BlacklistCount: number;
  AlarmCount: number;
  NonActiveBeaconCount: number;
  FirstActiveBeacon: string[];
  FirstActiveGateway: string[];
  FirstArea: string[];
  FirstBlacklist: string[];
  FirstAlarm: string[];
  FirstNonActiveBeacon: string[];
}

const TopCards: React.FC<TopCardsProps> = ({
  ActiveBeaconCount,
  ActiveGatewayCount,
  AreaCount,
  BlacklistCount,
  AlarmCount,
  NonActiveBeaconCount,
  FirstActiveBeacon,
  FirstActiveGateway,
  FirstArea,
  FirstBlacklist,
  FirstAlarm,
  FirstNonActiveBeacon,
}) => {
  const { t } = useTranslation();
  // const [data, setData] = useState(['100', '50', '25', '15', '25', '20', '15']);
  // Array of counts for display, order matches topcards
  const counts = [
    ActiveBeaconCount,
    ActiveGatewayCount,
    AreaCount,
    BlacklistCount,
    AlarmCount,
    NonActiveBeaconCount,
  ];
  // Array of "first" data arrays, order matches topcards
  const firstDataArrays = [
    FirstActiveBeacon,
    FirstActiveGateway,
    FirstArea,
    FirstBlacklist,
    FirstAlarm,
    FirstNonActiveBeacon,
  ];
  console.log("First Area: ", FirstArea);
  return (
    <Grid container spacing={3}>
      {topcards.map((topcard, i) => (
        <Grid
          key={i}
          size={{
            xs: 12,
            sm: 4,
            lg: 2,
          }}
        >
          <Box bgcolor={topcard.bgcolor + '.light'} textAlign="center">
            <CardContent>
              <img src={topcard.icon} alt={topcard.icon} width="50" />
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <Typography
                  color={topcard.bgcolor + '.dark'}
                  mt={1}
                  variant="subtitle1"
                  fontWeight={600}
                  fontSize={13}
                >
                  {t(`${topcard.title}`)}
                </Typography>
                <Tooltip
                  title={
                    firstDataArrays[i] && firstDataArrays[i].length > 0
                      ? counts[i] > firstDataArrays[i].length
                        ? `${firstDataArrays[i].join(', ')}, . . .`
                        : firstDataArrays[i].join(', ')
                      : 'No data'
                  }
                  arrow
                  placement="top"
                >
                  <IconButton size="small" sx={{ mt: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                color={topcard.bgcolor + '.main'}
                variant="h4"
                fontWeight={600}
                fontSize={25}
              >
                {counts[i]}
              </Typography>
            </CardContent>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default TopCards;
