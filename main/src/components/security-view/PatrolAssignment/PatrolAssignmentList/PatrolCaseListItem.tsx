import { Box, Stack, Typography, Chip, IconButton, useTheme, useMediaQuery } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { PatrolCaseType } from 'src/store/apps/crud/patrolCase';
import { getCaseStatusColor } from 'src/utils/caseStatus';

interface Props {
  data: PatrolCaseType;
  onClick?: (item: PatrolCaseType) => void;
}

const PatrolCaseListItem = ({ data, onClick }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      onClick={() => onClick?.(data)}
      sx={{
        p: 1.5,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {/* ===== LEFT CONTENT ===== */}
        <Box flex={1}>
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 0.5 : 2}
            alignItems={isMobile ? 'flex-start' : 'center'}
          >
            {/* Title */}
            <Typography fontWeight={600}>{data.title}</Typography>

            {/* Case Type */}

            <Stack direction="row" spacing={1}>
              <Typography fontSize={12} color="text.secondary">
                Type:
              </Typography>
              <Typography
                fontSize={12}
                fontWeight={600}
                //   color="text.secondary"
              >
                {data.caseType}
              </Typography>
            </Stack>

            {/* Status Chip */}
            <Chip
              size="small"
              label={data.caseStatus}
              color={getCaseStatusColor(data.caseStatus)}
            />
          </Stack>

          {/* Security Name */}
          <Typography fontSize={12} color="text.secondary" mt={0.5}>
            Security: {data.security?.name ?? '-'}
          </Typography>
        </Box>

        {/* ===== CHEVRON ===== */}
        <IconButton size="small">
          <ChevronRightIcon />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default PatrolCaseListItem;
