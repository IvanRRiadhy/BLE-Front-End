import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Divider,
  IconButton,
  Stack,
  Avatar,
  useTheme,
  DialogActions,
  Button,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import PatrolScheduleCalendarDialog from './PatrolScheduleCalendarDialog';
import PatrolRouteDetailDialog from './PatrolRouteDetailDialog';
import { PatrolDetailPayload } from 'src/store/apps/crud/patrolRoute';

interface PatrolDetailDialogProps {
  open: boolean;
  data: PatrolDetailPayload;
  onClose: () => void;
}

const PatrolDetailDialog = ({ open, data, onClose }: PatrolDetailDialogProps) => {
  const theme = useTheme();

  const [openSchedule, setOpenSchedule] = useState(false);
  const [openRoute, setOpenRoute] = useState(false);

  const { patrolAssignment, route } = data;

  /* ===== derived values ===== */

  const areaCount = route?.patrolAreas?.length ? Math.max(route.patrolAreas.length - 2, 0) : 0;

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString('en-GB') : '-');



  /* ===================== render ===================== */

  return (
    <>
      {/* ================= MAIN DIALOG ================= */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        {/* ===== Header ===== */}
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700} fontSize={18}>
              {patrolAssignment.name}
            </Typography>
            <IconButton onClick={onClose}>
              <IconX size={18} />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* ===== Content ===== */}
        <DialogContent>
          {/* ===== Description & Dates ===== */}
          <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
            {/* Description */}
            <Box flex="1 1 60%">
              <Typography fontSize={12} color="text.secondary">
                Description
              </Typography>
              <Typography fontSize={14}>{patrolAssignment.description || '-'}</Typography>
            </Box>

            {/* Schedule */}
            <Box flex="1 1 35%" sx={{ cursor: 'pointer' }} onClick={() => setOpenSchedule(true)}>
              <Typography fontSize={12} color="text.secondary">
                Active From
              </Typography>
              <Typography fontWeight={600}>{formatDate(patrolAssignment.startDate)}</Typography>

              <Typography fontSize={12} color="text.secondary" mt={1}>
                Until
              </Typography>
              <Typography fontWeight={600}>{formatDate(patrolAssignment.endDate)}</Typography>
            </Box>
          </Box>

          <Divider />

          {/* ===== Route Section ===== */}
          <Box
            mt={2}
            textAlign="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => setOpenRoute(true)}
          >
            <Typography fontSize={12} color="text.secondary" mb={0.5}>
              Route
            </Typography>

            <Typography fontWeight={600}>{route?.name ?? 'Unknown Route'}</Typography>

            <Typography fontSize={13} mt={0.5} color="text.secondary">
              {`From ${route?.startAreaName ?? '-'}`}
              {areaCount > 0 && ` ————— ${areaCount} Area${areaCount > 1 ? 's' : ''} ————— `}
              {areaCount === 0 && ' ————— '}
              {`To ${route?.endAreaName ?? '-'}`}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ===== Securities ===== */}
          <Typography fontWeight={600} mb={1}>
            Securities on Patrol
          </Typography>

          <Stack spacing={1}>
            {patrolAssignment.securities?.map((sec) => (
              <Box
                key={sec.id}
                display="flex"
                alignItems="center"
                gap={1.5}
                p={1}
                borderRadius={1}
                sx={{ backgroundColor: theme.palette.action.hover }}
              >
                <Avatar sx={{ width: 32, height: 32 }}>{sec.name.charAt(0)}</Avatar>

                <Box flex={1}>
                  <Typography fontWeight={600} fontSize={14}>
                    {sec.name}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">
                    {sec.identityId}
                  </Typography>
                </Box>

                <Typography fontSize={12} fontWeight={600} color={theme.palette.success.main}>
                  On Patrol
                </Typography>
              </Box>
            ))}

            {!patrolAssignment.securities?.length && (
              <Typography fontSize={12} color="text.secondary">
                No securities assigned
              </Typography>
            )}
          </Stack>
        </DialogContent>

        {/* ===== Actions ===== */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Close
          </Button>

          <Button variant="contained" color="primary" disabled>
            Start Patrol
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= SCHEDULE DIALOG ================= */}
      <PatrolScheduleCalendarDialog
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        startDate={patrolAssignment.startDate}
        endDate={patrolAssignment.endDate}
        timeGroups={data.timeGroups}
      />

      {/* ================= ROUTE DIALOG ================= */}
      <PatrolRouteDetailDialog open={openRoute} route={route} onClose={() => setOpenRoute(false)} />
    </>
  );
};

export default PatrolDetailDialog;
