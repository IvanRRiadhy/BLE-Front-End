import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Grid2 as Grid,
  Skeleton,
  CircularProgress,
} from '@mui/material';
// import Grid from '@mui/material/Grid2';
import { BASE_URL } from 'src/utils/axios';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { fontWeight } from '@mui/system';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useEffect, useState, useMemo } from 'react';
import { formatFullDateTime } from 'src/utils/time';
import { useNewVisitorSession } from 'src/hooks/useVisitorSession';
import {
  VisitorSessionPersonType,
  VisitorSessionResponseType,
} from 'src/store/apps/crud/visitorSession';
import toast from 'react-hot-toast';
import InvestigateReplayDialog from './InvestigateReplayDialog';
import { memberType } from 'src/store/apps/crud/member';
dayjs.extend(duration);

const InvestigateContent = () => {
  const selectedVisitor: VisitorType  = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedVisitor,
  );
  const selectedMember: memberType  = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedMember, 
  );
    const selectedSecurity: memberType  = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedSecurity, 
  );
  const investigateFilter = useSelector(
    (state: RootState) => state.VisitorSessionReducer.newVisitorSessionFilter,
  );

  // const visitorSessions = useSelector(
  //   (state: RootState) => state.VisitorSessionReducer.visitorSessions,
  // );
  const [sessionData, setSessionData] = useState<VisitorSessionResponseType | null>(null);
  const investigateMutation = useNewVisitorSession();
  // const isLoading = useSelector(
  //   (state: RootState) => state.VisitorSessionReducer.isLoading,
  // );
  const [isLoading, setIsLoading] = useState(false);
  const language = useSelector((state: RootState) => state.settings.isLanguage);

  const [openReplay, setOpenReplay] = useState(false);

  const selectedPerson = useMemo(() => {
    switch (investigateFilter.personType) {
      case 'member':
        return selectedMember;
      case 'security':
        return selectedSecurity;
      case 'visitor':
      default:
        return selectedVisitor;
    }
  }, [investigateFilter.personType, selectedVisitor, selectedMember, selectedSecurity]);

  const personName = selectedPerson?.name || '';
  const personId = selectedPerson?.id || '';

  const [replayData, setReplayData] = useState<{
    personName: string;
    floorplanImage: string;
    floorplanName: string;
    points: any[];
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!personId) return;

      try {
        setIsLoading(true);

        const res = await investigateMutation.mutateAsync({
          filter: {
            ...investigateFilter,
          },
          options: {
            includeSummary: true,
            includeVisualPaths: true,
            includeIncident: true,
          },
        });

        setSessionData(res);
      } catch (error) {
        console.error(error);
        toast.error('Error fetching visitor sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [investigateFilter, selectedVisitor]);

  //Handler
  const handleOpenReplay = (person: VisitorSessionPersonType, session: any) => {
    if (!sessionData) return;
    console.log('Session Data', sessionData);
    const floorplan = sessionData.visualPaths.floorplans[session.floorplanId];

    if (!floorplan) {
      toast.error('No tracking path available for this session');
      return;
    }

    setReplayData({
      personName: person.personName,
      floorplanImage: floorplan.floorplanImage,
      floorplanName: floorplan.floorplanName,
      points: floorplan.points,
    });

    setOpenReplay(true);
  };

  const InvestigateSkeleton = () => {
    return (
      <Box p={3}>
        {/* Top Section Skeleton */}
        <Box display="flex" gap={4} mb={3}>
          {/* Avatar Skeleton */}
          <Skeleton variant="circular" width={160} height={160} />

          {/* Visitor Fields Skeleton */}
          <Box flexGrow={1}>
            <Grid container spacing={2}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Skeleton width="40%" height={22} />
                  <Skeleton width="80%" height={18} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        <Skeleton width={200} height={32} sx={{ mb: 2 }} />

        {/* Track Cards Skeleton */}
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
              <Box
                sx={{
                  border: '1px solid #CCC',
                  borderRadius: 1.5,
                  height: 180,
                  p: 1,
                }}
              >
                <Skeleton variant="rounded" width="100%" height={100} />

                <Skeleton width="90%" height={20} sx={{ mt: 1 }} />
                <Skeleton width="100%" height={16} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  if (isLoading) return <InvestigateSkeleton />;

  if (!personId) {
    const personLabel = investigateFilter.personType || 'person';
    return (
      <Box p={3} textAlign="center" mt={5}>
        <Typography variant="h4" color="text.secondary" align="center">
          No {personLabel} selected. Please use the filter to choose a {personLabel}.
        </Typography>
      </Box>
    );
  }

  const field = {
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%', // important for Grid2
  };
  const value = {
    fontWeight: 300,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%', // important for Grid2
  };

  const ellipsisText = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%', // important for Grid2
  };

  return (
    <>
      {/* ================= LOADING ================= */}
      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh" width="100%">
          <CircularProgress size={50} />
        </Box>
      )}

      {/* ================= NO PERSON SELECTED ================= */}
      {!isLoading && !personId && (
        <Box p={3} textAlign="center" mt={5}>
          <Typography variant="h4" color="text.secondary">
            No {investigateFilter.personType || 'person'} selected. Please use the filter to choose
            one.
          </Typography>
        </Box>
      )}

      {/* ================= MAIN CONTENT ================= */}
      {!isLoading && personId && sessionData && (
        <Box p={3}>
          {/* ================= PERSON PROFILE ================= */}
          <Box
            display="flex"
            alignItems="flex-start"
            gap={4}
            mb={2}
            sx={{ borderBottom: '1px solid #DDD', pb: 3 }}
          >
            {/* PHOTO */}
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              sx={{ minWidth: 180 }}
            >
              <Avatar
                alt="Person Face"
                src={`${BASE_URL}${selectedPerson.faceImage}`}
                sx={{
                  width: 160,
                  height: 160,
                  mb: 1,
                  border: '3px solid #1976d2',
                }}
              />
            </Box>

            {/* PERSON INFO */}
            <Box flexGrow={1}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Name</Typography>

                  <Box display="flex" gap={1}>
                    <Typography sx={value}>{selectedPerson.name}</Typography>

                    {(selectedPerson as any).isBlacklist ? (
                      <Chip
                        label="Blacklisted"
                        color="error"
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (selectedPerson as any).isVip ? (
                      <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
                    ) : null}
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Organization</Typography>
                  <Typography sx={value}>
                    {(selectedPerson as VisitorType).organizationName ||
                      (selectedPerson as memberType).organization?.name}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Gender</Typography>
                  <Typography sx={value}>{selectedPerson.gender}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Address</Typography>
                  <Typography sx={value}>{selectedPerson.address}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Card Number</Typography>
                  <Typography sx={value}>{selectedPerson.cardNumber}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>BLE Card Number</Typography>
                  <Typography sx={value}>{selectedPerson.bleCardNumber}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Department</Typography>
                  <Typography sx={value}>
                    {(selectedPerson as VisitorType).departmentName ||
                      (selectedPerson as memberType).department?.name}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>District</Typography>
                  <Typography sx={value}>
                    {(selectedPerson as VisitorType).districtName ||
                      (selectedPerson as memberType).district?.name}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Identity Type</Typography>
                  <Typography sx={value}>
                    {(selectedPerson as VisitorType).identityType || 'Identity'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Identity ID</Typography>
                  <Typography sx={value}>{selectedPerson.identityId}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Email</Typography>
                  <Typography sx={value}>{selectedPerson.email}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Phone</Typography>
                  <Typography sx={value}>{selectedPerson.phone}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>

          {/* ================= TRACK DATA ================= */}
          <Typography variant="h5" fontWeight="bold" mb={2}>
            Track Data
          </Typography>

          <Grid container spacing={3}>
            {sessionData.persons.flatMap((person) =>
              person.sessions.map((session, idx) => {
                const imgSrc = session.floorplanImage
                  ? `${BASE_URL}${session.floorplanImage}`
                  : null;

                const lang = language === 'id' ? 'id' : 'en';
                const append = language === 'id' ? 'hingga' : 'to';

                const startFormatted = session.enterTime
                  ? formatFullDateTime(session.enterTime, lang)
                  : null;

                const endFormatted = session.exitTime
                  ? formatFullDateTime(session.exitTime, lang)
                  : null;

                let timeRange = '-';

                if (startFormatted && endFormatted) {
                  timeRange = `${startFormatted} ${append} ${endFormatted}`;
                }

                return (
                  <Grid key={idx} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                    <Box
                      onClick={() => handleOpenReplay(person, session)}
                      sx={{
                        border: '1px solid #CCC',
                        borderRadius: 1.5,
                        p: 1,
                        height: '100%',
                        bgcolor: '#fafafa',
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      {/* IMAGE */}
                      <Box
                        sx={{
                          width: '100%',
                          height: 100,
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '1px solid #DDD',
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#e1e1e1',
                        }}
                      >
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt="Floorplan"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <Typography sx={{ color: '#777' }}>No Image</Typography>
                        )}
                      </Box>

                      {/* AREA */}
                      <Typography
                        fontWeight={700}
                        fontSize="0.85rem"
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {session.floorplanName} | {session.areaName}
                      </Typography>

                      {/* TIME */}
                      <Typography fontWeight={400} fontSize="0.75rem" color="text.secondary">
                        {timeRange}
                      </Typography>
                    </Box>
                  </Grid>
                );
              }),
            )}
          </Grid>
          {replayData && (
            <InvestigateReplayDialog
              open={openReplay}
              onClose={() => setOpenReplay(false)}
              personName={replayData.personName}
              floorplanImage={replayData.floorplanImage}
              floorplanName={replayData.floorplanName}
              points={replayData.points}
            />
          )}
        </Box>
      )}
    </>
  );
};

export default InvestigateContent;
