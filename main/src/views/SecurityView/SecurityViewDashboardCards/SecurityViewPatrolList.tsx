import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePatrolAssignList } from 'src/hooks/usePatrolRoute';
import SecurityViewPatrolListItem from 'src/components/security-view/PatrolAssignment/SecurityViewPatrol/SecurityViewPatrolListItem';
import { useState, useEffect, useRef } from 'react';
import {
  PatrolAssignType,
  PatrolDetailPayload,
  PatrolRouteType,
} from 'src/store/apps/crud/patrolRoute';
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';
import PatrolDetailDialog from 'src/components/security-view/PatrolAssignment/SecurityViewPatrol/PatrolDetailDialog';
import { toast} from 'react-hot-toast';

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: 'startDate',
  sortDir: 'desc' as 'asc' | 'desc',
  searchValue: '',
  filters: {
    // 'Securities.Id': ['eba4833a-6e5d-4181-8e18-5776cadd0998'],
  },
};

const SecurityViewPatrolList = () => {
  const prevPatrolRef = useRef<PatrolAssignType[]>([]);
  const { t } = useTranslation();
  const { data: patrols, isLoading } = usePatrolAssignList(defaultFilter);
  const patrolData = patrols?.data || [];
  
  useEffect(() => {
  if (!patrolData || patrolData.length === 0) return;

  const prev = prevPatrolRef.current;

  // first load → don't trigger toast
  if (prev.length === 0) {
    prevPatrolRef.current = patrolData;
    return;
  }

  // 🔥 detect new patrols
  const prevIds = new Set(prev.map((x) => x.id));
  const newItems = patrolData.filter((x) => !prevIds.has(x.id));

  if (newItems.length > 0) {
    toast(`${newItems.length} new patrol assignment(s)!`, {
      duration: 4000,
      style: {
            borderRadius: '10px',
            background: '#ffc107',
            color: '#fff',
          }
    });
    newItems.forEach((x) => {
      toast(
        `New Patrol: ${x.name} | ${formatTime(x.startDate)} - ${formatTime(x.endDate)}`,
        {
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#ffc107',
            color: '#fff',
          }
        }
      );
    })
    console.log('New patrols:', newItems);
  }

  prevPatrolRef.current = patrolData;
}, [patrolData]);
  // const [detail, setDetail] = useState<PatrolDetailPayload | null>(null);
  const [selectedPatrol, setSelectedPatrol] = useState<PatrolAssignType | null>(null);

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
          backgroundColor: 'background.default',
          borderRadius: '25px',
          boxShadow: (theme) => theme.shadows[10],
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
              color: 'primary.main',
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
          {!isLoading && patrolData.length === 0 ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'text.secondary',
                px: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                No Patrol Assigned
              </Typography>
            </Box>
          ) : (
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
                  backgroundColor: index % 2 !== 0 ? 'grey.50' : 'background.paper',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <SecurityViewPatrolListItem patrol={item} openDetail={setSelectedPatrol} />
              </Stack>
            ))
          )}
        </Box>
      </Box>
      {/* Detail Dialog */}
      {selectedPatrol && (
        <PatrolDetailDialog open patrol={selectedPatrol} onClose={() => setSelectedPatrol(null)} />
      )}
    </>
  );
};

export default SecurityViewPatrolList;
