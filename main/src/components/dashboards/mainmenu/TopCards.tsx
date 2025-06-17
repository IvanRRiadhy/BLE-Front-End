import { Box, CardContent, Grid2 as Grid, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import icon1 from '../../../assets/images/svgs/icon-pin-inactive.svg';
import icon2 from '../../../assets/images/svgs/icon-pin-active.svg';
import icon3 from '../../../assets/images/svgs/icon-antena.svg';
import icon4 from '../../../assets/images/svgs/icon-box2.svg';
import icon5 from '../../../assets/images/svgs/icon-block.svg';
import icon6 from '../../../assets/images/svgs/icon-exclamation.svg';
import { useState } from 'react';

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
    title: 'Room',
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
  data: string[];
}

const TopCards: React.FC<TopCardsProps> = ({ data }) => {
  const { t } = useTranslation();
  // const [data, setData] = useState(['100', '50', '25', '15', '25', '20', '15']);

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
              <Typography
                color={topcard.bgcolor + '.dark'}
                mt={1}
                variant="subtitle1"
                fontWeight={600}
                fontSize={13}
              >
                {t(`${topcard.title}`)}
              </Typography>
              <Typography
                color={topcard.bgcolor + '.main'}
                variant="h4"
                fontWeight={600}
                fontSize={25}
              >
                {data[topcards.indexOf(topcard)]}
              </Typography>
            </CardContent>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default TopCards;
