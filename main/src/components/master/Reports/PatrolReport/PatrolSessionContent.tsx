import {
  Box,
  Typography,
  Divider,
  Stack,
  Avatar,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Chip,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useState, useMemo, useRef, useEffect } from 'react';
import { usePatrolReportList } from 'src/hooks/usePatrolReport';
import { PatrolReportType } from 'src/store/apps/crud/patrolReport';
import { PatrolAssignType, SecurityType } from 'src/store/apps/crud/patrolRoute';
import { defaultPatrolReportFilter } from 'src/store/apps/defaultForm';
import { getCaseStatusColor } from 'src/utils/caseStatus';
import { useTranslation } from 'react-i18next';

interface Props {
  sec: SecurityType;
  patrol: PatrolAssignType;
  onSecurityClick: (sec: SecurityType | null) => void;
}

const PatrolReportSessionContent = ({ sec, patrol, onSecurityClick }: Props) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [lineWidth, setLineWidth] = useState(0);

  const { data: data } = usePatrolReportList({
    ...defaultPatrolReportFilter,
    filters: { assignmentId: patrol.id, securityId: sec.id },
  });

  const patrolReportData = data?.data ?? [];

  const [selectedSession, setSelectedSession] = useState<PatrolReportType | null>(null);

  const totalSessions = patrolReportData.length;

  const totalCases = useMemo(
    () => patrolReportData.reduce((acc, session) => acc + (session.cases?.length ?? 0), 0),
    [patrolReportData],
  );

  const first = patrolReportData[0];

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleString('en-GB') : '-');

    const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };

  const sortedTimeline = useMemo(() => {
    if (!selectedSession?.timeline) return [];

    return [...selectedSession.timeline].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [selectedSession]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;

      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);

      setLineWidth(scrollWidth);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [sortedTimeline]);

  // ⬇ AFTER ALL HOOKS
  if (!data) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 2 : 3}>
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3}>
        {/* ================= LEFT PANEL ================= */}
        <Box
          height={'83vh'}
          width={isMobile ? '100%' : 360}
          p={2}
          borderRadius={2}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {/* Back Button */}
          <Box mb={2}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => onSecurityClick(null)}
            >
              Back
            </Button>
          </Box>
          {/* SECURITY */}
          <Typography fontWeight={700} fontSize={20}>
            {first?.securityName}
          </Typography>
          <Typography fontSize={13} color="text.secondary">
            {first?.securityEmployeeNumber}
          </Typography>

          <Box mt={2}>
            <Typography fontWeight={600}>{first?.assignmentName}</Typography>
            <Typography fontSize={13} color="text.secondary">
              Route: {first?.routeName}
            </Typography>
          </Box>

          <Box mt={2}>
            <Typography fontSize={13}>
              Sessions: <b>{totalSessions}</b>
            </Typography>
            <Typography fontSize={13}>
              Total Cases: <b>{totalCases}</b>
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ================= SESSION LIST ================= */}
          <Typography fontWeight={600} mb={1}>
            Sessions
          </Typography>

          <Stack spacing={1}>
            {patrolReportData.map((session) => (
              <Box
                key={session.sessionId}
                p={1.5}
                borderRadius={1}
                sx={{
                  cursor: 'pointer',
                  backgroundColor:
                    selectedSession?.sessionId === session.sessionId
                      ? theme.palette.action.selected
                      : theme.palette.action.hover,
                }}
                onClick={() => setSelectedSession(session)}
              >
                <Typography fontWeight={600} fontSize={14}>
                  {formatTime(session.startedAt)}
                </Typography>

                <Typography fontSize={12} color="text.secondary">
                  Duration: {session.durationFormatted ?? '-'} | Completion:{' '}
                  {session.metrics?.completionPercentage ?? 0}% | Cases: {session.cases?.length ?? 0}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* ================= RIGHT PANEL ================= */}
        <Box
          flex={1}
          height="83vh"
          minWidth={0}
          display="flex"
          flexDirection="column"
          gap={2}
          overflow="hidden"
        >
          {/* ===== Timeline Section ===== */}
          <Box
            p={2}
            minHeight={'fit-content'}
            borderRadius={2}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              overflow: 'hidden', // prevent parent scroll
              position: 'relative',
            }}
          >
            <Typography fontWeight={700} fontSize={18} mb={2}>
              Session Timeline
            </Typography>
            {/* LEFT ARROW */}
            {showLeftArrow && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  cursor: 'pointer',
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: '50%',
                  boxShadow: 1,
                  p: 0.5,
                }}
                onClick={() => {
                  timelineRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
                }}
              >
                <ArrowBackIosIcon fontSize="small" />
              </Box>
            )}

            {/* RIGHT ARROW */}
            {showRightArrow && (
              <Box
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  cursor: 'pointer',
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: '50%',
                  boxShadow: 1,
                  p: 0.5,
                }}
                onClick={() => {
                  timelineRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
                }}
              >
                <ArrowForwardIosIcon fontSize="small" />
              </Box>
            )}

            {sortedTimeline.length ? (
              <Box
                sx={{
                  position: 'relative',
                  overflow: 'hidden', // prevent child overflow
                }}
              >
                <Box
                  ref={timelineRef}
                  sx={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollBehavior: 'smooth',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      py: 10,
                      px: 6,
                      gap: 14,
                    }}
                  >
                    {/* CENTER LINE */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '180px',
                        width: `${lineWidth - 320}px`,
                        height: 3,
                        backgroundColor: theme.palette.divider,
                        transform: 'translateY(-50%)',
                        zIndex: 0,
                      }}
                    />

                    {sortedTimeline.map((item, index) => {
                      const isTop = index % 2 === 0;

                      return (
                        <Box
                          key={index}
                          sx={{
                            minWidth: 260,
                            height: 200,
                            position: 'relative',
                            scrollSnapAlign: 'center',
                            zIndex: 1,
                          }}
                        >
                          {/* DOT */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              backgroundColor: item.isDelayed
                                ? theme.palette.error.main
                                : theme.palette.primary.main,
                              border: `4px solid ${theme.palette.background.paper}`,
                              boxShadow: `0 0 0 3px ${theme.palette.divider}`,
                              zIndex: 2,
                            }}
                          />

                          {/* VERTICAL LINE */}
                          <Box
                            sx={{
                              position: 'absolute',
                              left: '50%',
                              width: 3,
                              height: 60,
                              backgroundColor: theme.palette.divider,
                              transform: 'translateX(-50%)',
                              top: isTop ? 'calc(50% - 60px)' : '50%',
                            }}
                          />

                          {/* TEXT BLOCK */}
                          <Box
                            sx={{
                              position: 'absolute',
                              width: 200,
                              textAlign: 'right',
                              right: '55%',
                              top: isTop ? 'calc(50% - 120px)' : 'calc(50% + 70px)',
                            }}
                          >
                            <Typography fontWeight={700}>{item.stageName}</Typography>
                            <Typography fontSize={12} color="text.secondary">
                                {formatTime(item.timestamp)}
                            </Typography>

                            {item.durationFormatted && (
                              <Typography fontSize={13} color="text.secondary">
                                Duration: {item.durationFormatted}
                              </Typography>
                            )}

                            {item.isDelayed && item.delaySeconds && (
                              <Typography fontSize={13} color="error.main">
                                Delayed by: {item.delaySeconds}s
                              </Typography>
                            )}

                            {item.notes && (
                              <Typography fontSize={12} color="text.secondary">
                                {item.notes}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Typography fontSize={13} color="text.secondary">
                No timeline data
              </Typography>
            )}
          </Box>

          {/* ===== Cases Section ===== */}
          <Box
            flex={1}
            minHeight={0}
            display="flex"
            flexDirection="column"
            borderRadius={2}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {/* 🔹 FIXED HEADER */}
            <Box
              sx={{
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                flexShrink: 0,
              }}
            >
              <Typography fontWeight={700} fontSize={18}>
                Session Cases
              </Typography>
            </Box>

            {/* 🔹 SCROLL AREA */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                p: 2,
              }}
            >
              {selectedSession?.cases?.length ? (
                <Stack spacing={1}>
                  {selectedSession.cases.map((item: any) => (
                    <Box
                      key={item.caseId}
                      p={1.5}
                      borderRadius={1}
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Typography fontWeight={600}>{item.title}</Typography>

                      <Typography fontSize={12} color="text.secondary">
                        {formatDate(item.reportedAt)}
                      </Typography>

                      <Box mt={1}>
                        <Chip
                          size="small"
                          label={item.caseStatus}
                          color={getCaseStatusColor(item.caseStatus)}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography fontSize={13} color="text.secondary">
                  No cases in this session
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PatrolReportSessionContent;
