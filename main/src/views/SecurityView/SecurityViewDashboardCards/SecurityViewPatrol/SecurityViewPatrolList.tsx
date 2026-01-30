import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePatrolAssignList } from 'src/hooks/usePatrolRoute';
import SecurityViewPatrolListItem from './SecurityViewPatrolListItem';
import { useState } from 'react';
import { PatrolAssignType, PatrolRouteType } from 'src/store/apps/crud/patrolRoute';
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';
import PatrolDetailDialog from './PatrolDetailDialog';

export type PatrolDetailPayload = {
  patrolAssignment: PatrolAssignType;
  route: PatrolRouteType;
  timeGroups: TimeGroupType[];
  nearestPatrol?: Date | null;
};

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: 'startDate',
  sortDir: 'desc' as 'asc' | 'desc',
  searchValue: '',
  filters: {
    'Securities.Id': ['eba4833a-6e5d-4181-8e18-5776cadd0998'],
  },
};

const SecurityViewPatrolList = () => {
  const { t } = useTranslation();
  const { data: patrols, isLoading } = usePatrolAssignList(defaultFilter);
  const patrolData = patrols?.data || [];
  const [detail, setDetail] = useState<PatrolDetailPayload | null>(null);
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };
  return (
    <>
      <Box
        sx={{
          width: '100%',
          height: '40vh',
          backgroundColor: 'white',
          borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Title */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pb: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: 20, md: 24 },
              fontWeight: 700,
              color: '#045498',
            }}
          >
            Patrol Assignment
          </Typography>
        </Box>

        {/* Scrollable list */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 1,
            py: 1,
          }}
        >
          {patrolData &&
            patrolData.length > 0 &&
            !isLoading &&
            patrolData.map((item, index) => (
              <Stack
                key={index}
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  p: 1,
                  width: '100%',
                  backgroundColor: index % 2 !== 0 ? 'grey.50' : 'white',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <SecurityViewPatrolListItem patrol={item} openDetail={setDetail} />
              </Stack>
            ))}
        </Box>
      </Box>
      {/* Detail Dialog */}
      {detail && <PatrolDetailDialog open data={detail} onClose={() => setDetail(null)} />}
    </>
  );
};

export default SecurityViewPatrolList;
