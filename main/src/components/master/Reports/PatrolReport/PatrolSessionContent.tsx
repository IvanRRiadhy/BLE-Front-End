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
  Dialog,
  DialogTitle,
  IconButton,
  DialogContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
import PatrolCaseOverview from 'src/components/security-view/PatrolCaseList/PatrolCaseOverview';
import { PatrolCaseType } from 'src/store/apps/crud/patrolCase';
import PatrolCaseListItem from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolCaseListItem';

interface Props {
  sec: SecurityType;
  patrol: PatrolAssignType;
  onSecurityClick: (sec: SecurityType | null) => void;
}

const PatrolReportSessionContent = ({ sec, patrol, onSecurityClick }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
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
  console.log('Session: ', selectedSession);
  const totalSessions = patrolReportData.length;

  const totalCases = useMemo(
    () => patrolReportData.reduce((acc, session) => acc + (session.cases?.length ?? 0), 0),
    [patrolReportData],
  );

  const first = patrolReportData[0];

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleString('en-GB') : '-');

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    console.log('Date: ', date, isoString);
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

    return [...selectedSession.timeline];
    // .sort((a, b) => a.orderIndex - b.orderIndex);
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

  const getTimelineColor = (item: any, index: number, timeline: any[]) => {
    const stage = item.stage?.toLowerCase() ?? '';

    // 🔵 Non checkpoint stages (Start / End / others)
    if (!stage.startsWith('checkpoint')) {
      return theme.palette.secondary.main;
    }
    const next = timeline[index + 1];

    const arrived = item.isArrived === true;
    const cleared = item.isCleared === true;

    const nextArrivedCleared = next && next.isArrived === true && next.isCleared === true;

    // 🔴 Under / Over always red
    if (item.dwellTimeStatus === 'Under' || item.dwellTimeStatus === 'Over') {
      return theme.palette.error.main;
    }

    // 🔴 Not arrived/cleared but next checkpoint finished
    if (!arrived && !cleared && nextArrivedCleared) {
      return theme.palette.error.main;
    }
    if (!arrived && !cleared && next?.isArrived === true) {
      return theme.palette.divider;
    }

    // 🟢 Completed + Normal
    if (arrived && cleared && item.dwellTimeStatus === 'Normal') {
      return theme.palette.success.main;
    }

    // 🔵 Arrived but not cleared
    if (arrived && !cleared) {
      return theme.palette.warning.main;
    }

    // 🔵 default fallback
    return theme.palette.primary.main;
  };

  //Case Dialog
  const [openCaseDialog, setOpenCaseDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<PatrolCaseType | undefined>(undefined);

  const handleCloseCaseDialog = () => {
    setOpenCaseDialog(false);
  };

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
                  {session.metrics?.completionPercentage ?? 0}% | Cases:{' '}
                  {session.cases?.length ?? 0}
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

                      const hasDwell =
                        item.dwellTimeFormatted &&
                        item.dwellTimeFormatted !== '' &&
                        item.dwellTimeStatus;

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
                              backgroundColor: getTimelineColor(item, index, sortedTimeline),
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
                              width: 180,
                              textAlign: 'right',
                              right: '55%',
                              ...(isTop
                                ? {
                                    bottom: 'calc(50% + 24px)', // anchor from center line upward
                                  }
                                : {
                                    top: 'calc(50% + 24px)', // anchor from center line downward
                                  }),
                            }}
                          >
                            <Typography fontWeight={700}>{item.stageName}</Typography>
                            <Typography fontSize={12} color="text.secondary">
                              {formatTime(item.timestamp)}
                            </Typography>

                            {/* ===== DWELL INFO ===== */}
                            {hasDwell ? (
                              <>
                                <Typography fontSize={13}>
                                  Security stayed for <b>{item.dwellTimeFormatted}</b>
                                </Typography>

                                {item.dwellTimeStatus !== 'Normal' && (
                                  <Typography fontSize={13} color="error.main">
                                    {item.dwellTimeStatus === 'Over'
                                      ? 'Stayed too long (Overstay)'
                                      : 'Left too early (Understay)'}
                                  </Typography>
                                )}

                                {(item.minDwellTimeSeconds || item.maxDwellTimeSeconds) && (
                                  <Typography fontSize={12} color="text.secondary">
                                    Expected stay: {item.minDwellTimeSeconds ?? '-'}s –{' '}
                                    {item.maxDwellTimeSeconds ?? '-'}s
                                  </Typography>
                                )}
                              </>
                            ) : item.orderIndex !== 0 ? (
                              <Typography fontSize={13} color="text.secondary" fontStyle="italic">
                                Security hasn’t checked this checkpoint
                              </Typography>
                            ) : (
                              <></>
                            )}

                            {item.isDelayed && item.delaySeconds && (
                              <Typography fontSize={13} color="error.main">
                                Delayed by: {item.delaySeconds}s
                              </Typography>
                            )}

                            {/* {item.notes && (
                              <Typography fontSize={12} color="text.secondary">
                                {item.notes}
                              </Typography>
                            )} */}
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
                      {/* <Typography fontWeight={600}>{item.title}</Typography>

                      <Typography fontSize={12} color="text.secondary">
                        {formatDate(item.reportedAt)}
                      </Typography>

                      <Box mt={1}>
                        <Chip
                          size="small"
                          label={item.caseStatus}
                          color={getCaseStatusColor(item.caseStatus)}
                        />
                      </Box> */}
                      <PatrolCaseListItem
                        data={item}
                        onClick={(c) => {
                          setSelectedCase(c);
                          setOpenCaseDialog(true);
                          //   handleEditCase(c);
                        }}
                      />
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
      {/* ================= CASE DIALOG ================= */}
      <Dialog open={openCaseDialog} onClose={() => handleCloseCaseDialog()} fullWidth maxWidth="lg">
        <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 0.5 : 2}
            alignItems={isMobile ? 'flex-start' : 'center'}
          >
            {/* Title */}
            <Typography fontWeight={800} fontSize={24}>
              Patrol Case Overview
            </Typography>
            {/* Status Chip */}
            <Chip
              size="small"
              label={selectedCase?.caseStatus}
              color={getCaseStatusColor(selectedCase?.caseStatus)}
            />
          </Stack>
          {/* Patrol Case Overview */}
          <IconButton onClick={() => handleCloseCaseDialog()}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedCase ? (
            <PatrolCaseOverview data={selectedCase} />
          ) : (
            <Typography color="text.secondary">No data selected</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PatrolReportSessionContent;
