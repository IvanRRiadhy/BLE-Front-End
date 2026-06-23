import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useInfiniteRealtimeAlarmLog } from 'src/hooks/useDashboard';
import { BASE_URL } from 'src/utils/axios';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';
import { useInView } from 'react-intersection-observer';

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 10,
  sortColumn: '',
  sortDir: 'desc',
  searchValue: '',
};

export interface AlarmLogItem {
  image: string;
  name: string;
  idleTime: string;
  triggerTime: string;
  firstGateway: string;
  secondGateway: string;
  status: string;
  color: string;
  buildingName: string;
  floorName: string;
  floorplanName: string;
  lastSeenTime: string;
}

const AlarmLog: React.FC = () => {
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteRealtimeAlarmLog(defaultFilter, 10);

  const { ref: sentinelRef, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flat raw data array (for click handler trigger lookup)
  const rawData: any[] = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.data) ?? [],
    [infiniteData],
  );

  function resolvePerson(x: any) {
    if (x.visitorId) {
      return { type: 'Visitor', name: x.visitorName, image: x.visitorFaceImage };
    }
    if (x.memberId) {
      return { type: 'Member', name: x.memberName, image: x.memberFaceImage };
    }
    if (x.securityId) {
      return { type: 'Security', name: x.securityName, image: x.securityFaceImage };
    }
    return { type: 'Unknown', name: '-', image: '' };
  }

  const log = useMemo<AlarmLogItem[]>(() => {
    return rawData.map((x: any) => {
      const person = resolvePerson(x);
      return {
        image: person.image ? `${BASE_URL}${person.image}` : '',
        name: person.name,
        idleTime: x.idleTimestamp ? new Date(x.idleTimestamp).toLocaleString() : '-',
        triggerTime: x.triggerTime ? new Date(x.triggerTime).toLocaleString() : '-',
        firstGateway: x.firstGatewayId ?? '-',
        secondGateway: x.secondGatewayId ?? '-',
        status: x.alarm ?? 'Unknown',
        color: x.alarmColor ?? '#000',
        buildingName: x.buildingName ?? '-',
        floorName: x.floorName ?? '-',
        floorplanName: x.floorplanName ?? '-',
        lastSeenTime: x.lastSeenAt ? new Date(x.lastSeenAt).toLocaleString() : '-',
      };
    });
  }, [rawData]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<AlarmTriggerType | null>(null);

  const redirectToAlarmList = (trigger: AlarmTriggerType) => {
    const params = new URLSearchParams();
    if (trigger.visitorId) params.set('visitorId', trigger.visitorId);
    if (trigger.memberId) params.set('memberId', trigger.memberId);
    params.set('alarmTriggerId', trigger.id);
    console.log('Redirecting to alarm list with params:', params.toString());
    window.location.href = `/alarm/alarmlist?${params.toString()}`;
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        backgroundColor: 'background.paper',
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Title */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pb: 2 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'primary.main' }}>
          Real-Time Alarm Log
        </Typography>
      </Box>

      {/* Scrollable list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {isLoading ? (
          // Initial skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <Stack key={i} direction="row" spacing={2} alignItems="center" sx={{ p: 1, mb: 1 }}>
              <Skeleton variant="circular" width={56} height={56} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="55%" height={20} />
                <Skeleton variant="text" width="40%" height={16} />
                <Skeleton variant="text" width="35%" height={14} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                <Skeleton variant="text" width={70} height={20} />
                <Skeleton variant="text" width={50} height={14} />
              </Box>
            </Stack>
          ))
        ) : log.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#9e9e9e',
              px: 2,
            }}
          >
            <Typography sx={{ fontSize: 16, fontWeight: 500 }}>
              There are no alarms yet
            </Typography>
          </Box>
        ) : (
          <>
            {log.map((item, index) => (
              <Stack
                key={`${index}-${rawData[index]?.id ?? index}`}
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  p: 1,
                  backgroundColor: 'transparent',
                  '&:hover': { backgroundColor: 'action.hover' },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: '100%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onClick={() => {
                  setSelectedTrigger(rawData[index]);
                  setConfirmOpen(true);
                }}
              >
                {/* Avatar */}
                <Avatar src={item.image} alt="user" sx={{ width: 56, height: 56 }} />

                {/* Left info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <SmartScrollingText
                    text={item.name}
                    sx={{ fontSize: 16, fontWeight: 600, color: 'textPrimary' }}
                  />
                  <SmartScrollingText
                    text={`${item.buildingName} | ${item.floorName}`}
                    sx={{ fontSize: 12, color: 'textSecondary' }}
                  />
                  <Typography sx={{ fontSize: 12, color: 'textSecondary' }}>
                    {item.idleTime}
                  </Typography>
                </Box>

                {/* Right info */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                  }}
                >
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: item.color }}>
                    {item.status}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'textSecondary' }}>
                    {item.secondGateway}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'textSecondary' }}>
                    {item.lastSeenTime}
                  </Typography>
                </Box>
              </Stack>
            ))}

            {/* Load-more skeletons */}
            {isFetchingNextPage &&
              Array.from({ length: 2 }).map((_, i) => (
                <Stack key={`sk-${i}`} direction="row" spacing={2} alignItems="center" sx={{ p: 1, mb: 1 }}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="55%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Skeleton variant="text" width={70} height={20} />
                    <Skeleton variant="text" width={50} height={14} />
                  </Box>
                </Stack>
              ))}

            {/* Intersection sentinel */}
            {hasNextPage && <div ref={sentinelRef} style={{ height: '20px' }} />}
          </>
        )}
      </Box>

      {/* Confirm navigation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Open Alarm Detail?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You are about to navigate to the Alarm Detail page. Do you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedTrigger) redirectToAlarmList(selectedTrigger);
              setConfirmOpen(false);
            }}
          >
            Go to Detail
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlarmLog;
