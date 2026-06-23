import { useEffect, useMemo } from 'react';
import { Box, Typography, Avatar, Stack, Skeleton } from '@mui/material';
import { useInfiniteUpcomingVisitor } from 'src/hooks/useDashboard';
import { BASE_URL } from 'src/utils/axios';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { useInView } from 'react-intersection-observer';

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 10,
  sortColumn: '',
  sortDir: 'desc',
  searchValue: '',
  timeRange: 'daily',
};

interface UpcomingVisitorItem {
  id: string;
  status: string;
  name: string;
  image: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  visitorPeriodStart?: string | null;
  visitorPeriodEnd?: string | null;
}

const statusColorMap: Record<string, string> = {
  denied: 'error.dark',
  checkout: 'primary.dark',
  checkin: 'success.dark',
};

const UpcomingVisitor: React.FC = () => {
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteUpcomingVisitor(defaultFilter, 10);

  const { ref: sentinelRef, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  function resolvePerson(x: any) {
    if (x.visitor) {
      return {
        type: 'Visitor',
        name: x.visitor.name,
        image: x.visitor.faceImage,
      };
    }

    if (x.member) {
      return {
        type: 'Member',
        name: x.member.name,
        image: x.member.faceImage,
      };
    }

    return {
      type: 'Unknown',
      name: x.visitorCode ? `${x.visitorCode} (Visit Code)` : '-',
      image: '',
    };
  }

  const upcomingVisitor = useMemo<UpcomingVisitorItem[]>(() => {
    const raw = infiniteData?.pages.flatMap((p) => p.data) ?? [];
    return raw.map((x: any) => ({
      id: x.id,
      status: x.status,
      name: resolvePerson(x).name,
      image: resolvePerson(x).image,
      checkInAt: x.checkedInAt,
      checkOutAt: x.checkedOutAt,
      visitorPeriodStart: x.visitorPeriodStart,
      visitorPeriodEnd: x.visitorPeriodEnd,
    }));
  }, [infiniteData]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
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
            fontSize: 24,
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          Visitor Today
        </Typography>
      </Box>

      {/* List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
        }}
      >
        {isLoading ? (
          // Initial skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <Stack key={i} direction="row" spacing={2} alignItems="center" sx={{ p: 1, mb: 1 }}>
              <Skeleton variant="circular" width={56} height={56} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={16} />
              </Box>
              <Skeleton variant="text" width={60} height={20} />
            </Stack>
          ))
        ) : upcomingVisitor.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              There are no visitors today
            </Typography>
          </Box>
        ) : (
          <>
            {upcomingVisitor.map((item, index: number) => (
              <Stack
                key={`${index}-${item.id}`}
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  p: 1,
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: '100%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {/* Avatar */}
                <Avatar
                  src={item.image ? `${BASE_URL}${item.image}` : ''}
                  alt="visitor"
                  sx={{ width: 56, height: 56 }}
                />

                {/* Visitor info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <SmartScrollingText
                    text={item.name}
                    fontSize={16}
                    fontWeight={600}
                    color="textPrimary"
                  />

                  <SmartScrollingText
                    text={item.visitorPeriodStart ? new Date(item.visitorPeriodStart).toLocaleString() : '-'}
                    fontSize={12}
                    color="textSecondary"
                  />
                </Box>

                {/* Status */}
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: statusColorMap[item.status.toLowerCase()] ?? 'text.primary',
                  }}
                >
                  {item.status}
                </Typography>
              </Stack>
            ))}

            {/* Load-more skeletons while fetching next page */}
            {isFetchingNextPage &&
              Array.from({ length: 2 }).map((_, i) => (
                <Stack key={`sk-${i}`} direction="row" spacing={2} alignItems="center" sx={{ p: 1, mb: 1 }}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                  <Skeleton variant="text" width={60} height={20} />
                </Stack>
              ))}

            {/* Intersection sentinel — only rendered while more data remains */}
            {hasNextPage && <div ref={sentinelRef} style={{ height: '20px' }} />}
          </>
        )}
      </Box>
    </Box>
  );
};

export default UpcomingVisitor;
