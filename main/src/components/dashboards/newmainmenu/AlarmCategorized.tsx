import { Box, Typography, Divider, Stack, Tooltip } from '@mui/material';
import { AbbreviatedNumber } from 'src/utils/numberAbbreviation';
import { useRef, useState, useCallback } from 'react';

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

/**
 * Renders a Typography label that shows a Tooltip only when
 * the text is actually truncated (scrollWidth > clientWidth).
 */
interface TruncatedLabelProps {
  text: string;
  sx?: object;
}

const TruncatedLabel: React.FC<TruncatedLabelProps> = ({ text, sx }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = textRef.current;
    if (el) {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }
  }, []);

  return (
    <Tooltip title={isOverflowing ? text : ''} placement="top" arrow>
      <Typography ref={textRef} onMouseEnter={checkOverflow} sx={sx}>
        {text}
      </Typography>
    </Tooltip>
  );
};

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
        boxShadow: (theme) => theme.shadows[10],
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
            color: 'primary.main',
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
              <TruncatedLabel
                text={formatTitle((item as AlarmByStatusItem).status)}
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1f4e79',
                  maxWidth: 120,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              />
              <AbbreviatedNumber
                value={(item as AlarmByStatusItem).total}
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1f4e79',
                  textAlign: 'center',
                  display: 'block',
                }}
              />
            </Box>
          ))}

        {isAlarmByArea &&
          Array.isArray(data) &&
          data.map((item) => (
            <Box key={(item as AlarmByAreaItem).areaName}>
              <TruncatedLabel
                text={formatTitle((item as AlarmByAreaItem).areaName)}
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
              />
              <AbbreviatedNumber
                value={(item as AlarmByAreaItem).total}
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1f4e79',
                  textAlign: 'center',
                  display: 'block',
                }}
              />
            </Box>
          ))}
      </Stack>
    </Box>
  );
};

export default AlarmCategorized;
