import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { IconChevronRight, IconExclamationCircleFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { usePatrolRouteId } from 'src/hooks/usePatrolRoute';
import { useTimeGroupList } from 'src/hooks/useTimeGroup';
import { PatrolAssignType, PatrolRouteType } from 'src/store/apps/crud/patrolRoute';
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';
import { defaultTimeGroupFilter } from 'src/store/apps/defaultForm';
import { PatrolDetailPayload } from 'src/store/apps/crud/patrolRoute';

/* ===================== types ===================== */

interface PatrolListItemProps {
  patrol: PatrolAssignType;
  openDetail: (payload: PatrolDetailPayload) => void;
}

type DayTimeMap = Record<string, { startTime: string; endTime: string }[]>;

/* ===================== constants ===================== */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ===================== helpers ===================== */

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDayTimeMap(timeGroups: TimeGroupType[] = []): DayTimeMap {
  return timeGroups
    .flatMap((tg) => tg.timeBlocks ?? [])
    .reduce((acc, block) => {
      acc[block.dayOfWeek] ??= [];
      acc[block.dayOfWeek].push({
        startTime: block.startTime.slice(0, 5),
        endTime: block.endTime.slice(0, 5),
      });
      return acc;
    }, {} as DayTimeMap);
}

function getNearestPatrol(timeMap: DayTimeMap): Date | null {
  const now = new Date();
  const todayIndex = now.getDay();

  let nearest: Date | null = null;

  for (let offset = 0; offset < 7; offset++) {
    const dayName = DAYS[(todayIndex + offset) % 7];
    const blocks = timeMap[dayName];
    if (!blocks) continue;

    for (const block of blocks) {
      const [h, m] = block.startTime.split(':').map(Number);
      const candidate = new Date(now);

      candidate.setDate(now.getDate() + offset);
      candidate.setHours(h, m, 0, 0);

      if (candidate > now && (!nearest || candidate < nearest)) {
        nearest = candidate;
      }
    }
  }

  return nearest;
}

/* ===================== component ===================== */

const SecurityViewPatrolListItem = ({ patrol, openDetail }: PatrolListItemProps) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  /* ===== fetch route ===== */
  const { data: routeData = {} as PatrolRouteType, isLoading } = usePatrolRouteId(
    patrol.patrolRouteId,
  );

  /* ===== fetch time groups (NOW FROM PATROL ASSIGNMENT) ===== */
  const { data: timeGroupRes } = useTimeGroupList({
    ...defaultTimeGroupFilter,
    filters: { id: [patrol.timeGroupId] },
  });

  const timeGroups = timeGroupRes?.data ?? [];
  console.log('Time Groups: ', timeGroups, 'for', patrol.name);
  /* ===== compute nearest patrol ===== */
  const timeMap = buildDayTimeMap(timeGroups);
  const nearestPatrol = getNearestPatrol(timeMap);

  /* ===== UI helpers ===== */
  const getDayLabel = (date: Date) => {
    if (isSameDay(date, now)) return t('Today');
    if (isSameDay(date, tomorrow)) return t('Tomorrow');
    return t(date.toLocaleString('en-GB', { weekday: 'long' }));
  };

  const getPatrolColor = (date: Date) => {
    if (isSameDay(date, now)) return theme.palette.error.dark;
    if (isSameDay(date, tomorrow)) return theme.palette.warning.main;
    return theme.palette.info.dark;
  };

  const formatNearestPatrol = (date: Date) => {
    const time = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${getDayLabel(date)} • ${time}`;
  };

  const startAreaName = !isLoading ? (routeData?.startAreaName ?? null) : null;

  /* ===== payload for detail dialog ===== */
  const payload: PatrolDetailPayload = {
    patrolAssignment: patrol,
    route: routeData,
    timeGroups,
    nearestPatrol,
  };

  /* ===================== render ===================== */

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        cursor: 'pointer',
      }}
      onClick={() => {
        openDetail(payload);
        console.log('payload', payload);
      }}
    >
      {/* LEFT */}
      <Box sx={{ flex: '0 0 50%', px: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#045498' }}>
          {patrol.name}
        </Typography>

        <Typography sx={{ fontSize: 12, color: '#045498' }}>{patrol.description}</Typography>
      </Box>

      {/* RIGHT */}
      <Box
        sx={{
          display: 'flex',
          flex: '0 0 50%',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#045498' }}>
            Start From :
          </Typography>

          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#045498' }}>
            {isLoading ? 'Loading...' : startAreaName || 'Unknown Area'}
          </Typography>

          {nearestPatrol && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: getPatrolColor(nearestPatrol),
                  textAlign: 'right',
                }}
              >
                Next patrol: {formatNearestPatrol(nearestPatrol)}
              </Typography>

              {isSameDay(nearestPatrol, now) && (
                <IconExclamationCircleFilled size={20} color={theme.palette.error.dark} />
              )}
            </Box>
          )}
        </Box>

        <Tooltip title="See Patrol Detail" placement="right">
          <IconButton size="small">
            <IconChevronRight size={20} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SecurityViewPatrolListItem;
