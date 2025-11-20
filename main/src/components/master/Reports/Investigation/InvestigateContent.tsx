import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import { Box, Typography, Chip, Avatar, Grid2 as Grid } from '@mui/material';
// import Grid from '@mui/material/Grid2';
import { BASE_URL } from 'src/utils/axios';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { fontWeight } from '@mui/system';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useEffect } from 'react';
import { formatFullDateTime } from 'src/utils/time';
dayjs.extend(duration);

const InvestigateContent = () => {
  const selectedVisitor: VisitorType | null = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedVisitor,
  );
  const visitorSessions = useSelector(
    (state: RootState) => state.VisitorSessionReducer.visitorSessions,
  );
  const language = useSelector((state: RootState) => state.customizer.isLanguage);

  useEffect(() => {
    console.log('Visitor Sessions:', visitorSessions);
  }, [visitorSessions]);

  if (!selectedVisitor) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="text.secondary">
          No visitor selected. Please use the filter to choose a visitor.
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
    <Box p={3}>
      {/* ================= TOP SECTION ================== */}
      <Box
        display="flex"
        alignItems="flex-start"
        gap={4}
        mb={2}
        sx={{ borderBottom: '1px solid #DDD', pb: 3 }}
      >
        {/* ============ VISITOR PHOTO ============ */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ minWidth: 180 }}
        >
          <Avatar
            alt="Visitor Face"
            src={`${BASE_URL}${selectedVisitor.faceImage}`}
            sx={{
              width: 160,
              height: 160,
              mb: 1,
              border: '3px solid #1976d2',
            }}
          />

          {/* <Box display="flex" gap={1} mt={1}>
            {selectedVisitor.isVip && (
              <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
            )}
            {selectedVisitor.isBlacklist && (
              <Chip label="Blacklisted" color="error" size="small" sx={{ fontWeight: 700 }} />
            )}
          </Box> */}
        </Box>

        {/* ============ VISITOR FIELDS ============ */}
        <Box flexGrow={1}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Name</Typography>

              <Box display="flex" gap={1}>
                <Typography sx={value}>{selectedVisitor.name}</Typography>
                {}
                {selectedVisitor.isBlacklist ? (
                  <Chip label="Blacklisted" color="error" size="small" sx={{ fontWeight: 700 }} />
                ) : selectedVisitor.isVip ? (
                  <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
                ) : (
                  <></>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Organization</Typography>
              <Typography sx={value}>{selectedVisitor.organizationName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Gender</Typography>
              <Typography sx={value}>{selectedVisitor.gender}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Address</Typography>
              <Typography sx={value}>{selectedVisitor.address}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Card Number</Typography>
              <Typography sx={value}>{selectedVisitor.cardNumber}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>BLE Card Number</Typography>
              <Typography sx={value}>{selectedVisitor.bleCardNumber}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Department</Typography>
              <Typography sx={value}>{selectedVisitor.departmentName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>District</Typography>
              <Typography sx={value}>{selectedVisitor.districtName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Identity Type</Typography>
              <Typography sx={value}>{selectedVisitor.identityType}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Identity ID</Typography>
              <Typography sx={value}>{selectedVisitor.identityId}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Email</Typography>
              <Typography sx={value}>{selectedVisitor.email}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Phone</Typography>
              <Typography sx={value}>{selectedVisitor.phone}</Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* ================= NEXT SECTION PLACEHOLDER ================== */}
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Track Data
      </Typography>

      <Grid container spacing={3}>
        {visitorSessions.map((s, idx) => {
          // (Later) When API adds floorplanImage:
          const imgSrc = s.floorplanImage ? `${BASE_URL}${s.floorplanImage}` : null;

          // Format time + duration
          const lang = language === 'id' ? 'id' : 'en';
          const append = language === 'id' ? 'hingga' : 'to';

          const startFormatted = s.enterTime ? formatFullDateTime(s.enterTime, lang) : null;
          const endFormatted = s.exitTime ? formatFullDateTime(s.exitTime, lang) : null;

          let timeRange = '-';
          if (startFormatted && endFormatted) {
            const dur = dayjs.duration(s.durationInMinutes ?? 0, 'minutes');
            // const durStr = dur.format('HH:mm');

            timeRange = `${startFormatted} ${append} ${endFormatted}`;
          }

          return (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
              <Box
                sx={{
                  border: '1px solid #CCC',
                  borderRadius: 1.5,
                  p: 1,
                  height: '100%',
                  bgcolor: '#fafafa',
                }}
              >
                {/* Floorplan Image placeholder */}
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

                {/* Floorplan Name */}
                <Typography
                  fontWeight={700}
                  fontSize="0.85rem"
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.floorplanName ?? 'Unknown Floorplan'} | {s.areaName ?? 'Unknown Area'}
                </Typography>

                {/* Time Range */}
                <Typography fontWeight={400} fontSize="0.75rem" color="text.secondary">
                  {timeRange}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default InvestigateContent;
