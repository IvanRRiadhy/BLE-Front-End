import {
  Box,
  Typography,
  Divider,
  Stack,
  Avatar,
  useTheme,
  useMediaQuery,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  IconButton,
  DialogContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';
import {
  PatrolAssignType,
  PatrolDetailPayload,
  SecurityType,
  SelectPatrolAssign,
} from 'src/store/apps/crud/patrolRoute';
import PatrolRouteDetailDialog from 'src/components/security-view/PatrolAssignment/SecurityViewPatrol/PatrolRouteDetailDialog';
import PatrolScheduleCalendarDialog from 'src/components/security-view/PatrolAssignment/SecurityViewPatrol/PatrolScheduleCalendarDialog';
import { useNavigate } from 'react-router';
import { useStartPatrol, useStopPatrol, usePatrolSessionList } from 'src/hooks/usePatrolSession';
import { PatrolSessionType } from 'src/store/apps/crud/patrolSession';
import {
  defaultPatrolCaseFilter,
  defaultPatrolCaseUploadForm,
  defaultPatrolReportFilter,
  defaultPatrolSessionFilter,
  defaultTimeGroupFilter,
} from 'src/store/apps/defaultForm';
import { useAllPatrolCase, usePatrolCaseList } from 'src/hooks/usePatrolCase';
import PatrolCaseDialog from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolCaseDialog';
import PatrolCaseOverview from 'src/components/security-view/PatrolCaseList/PatrolCaseOverview';
import { CaseUploadType, PatrolCaseType } from 'src/store/apps/crud/patrolCase';
import PatrolCaseListItem from 'src/components/security-view/PatrolAssignment/PatrolAssignmentList/PatrolCaseListItem';
import toast from 'react-hot-toast';
import { use } from 'i18next';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { useSearchParams } from 'react-router';
import { usePatrolAssignmentId, usePatrolRouteId } from 'src/hooks/usePatrolRoute';
import { useTimeGroupList } from 'src/hooks/useTimeGroup';
import { getCaseStatusColor } from 'src/utils/caseStatus';
import { usePatrolReport } from 'src/hooks/usePatrolReport';
import { buildPatrolReportRows } from 'src/utils/exportPatrolReport';
import { getUserTimezone } from 'src/utils/time';

interface Props {
  patrol: PatrolAssignType;
  onSecurityClick: (sec: SecurityType | null) => void;
}

const PatrolReportContent = ({ patrol, onSecurityClick }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') ?? undefined;

  const { data: patrolRes } = usePatrolAssignmentId(id ?? '');

  // const patrol2 = patrolRes?.collection?.data;
  // const patrol = useSelector((state: RootState) => state.PatrolRouteReducer.selectedPatrolAssign);

  const { data: route } = usePatrolRouteId(patrol?.patrolRouteId ?? '');

  const { data: timeGroupRes } = useTimeGroupList({
    ...defaultTimeGroupFilter,
    filters: { id: patrol?.timeGroupId ? [patrol.timeGroupId] : [] },
  });

  const timeGroups = timeGroupRes?.data ?? [];

  const [openSchedule, setOpenSchedule] = useState(false);
  const [openRoute, setOpenRoute] = useState(false);

  const [openCaseDialog, setOpenCaseDialog] = useState(false);
  const [caseDialogType, setCaseDialogType] = useState<'add' | 'edit'>('add');
  const [selectedCase, setSelectedCase] = useState<PatrolCaseType | undefined>(undefined);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString('en-GB') : '-');

  const { data: caseData, isLoading: isCaseLoading } = usePatrolCaseList({
    ...defaultPatrolCaseFilter,
    filters: { PatrolAssignmentId: patrol?.id },
  });
  const patrolCaseData = caseData?.data || [];

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <Box display="flex" justifyContent="space-between">
      <Typography fontSize={12} color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
  const areaCount = route?.patrolAreas?.length ? Math.max(route.patrolAreas.length - 2, 0) : 0;

  // const mapCaseToForm = (data: any): CaseUploadType => ({
  //   title: data.title ?? '',
  //   description: data.description ?? '',
  //   caseType: data.caseType ?? '',
  //   threatLevel: data.threatLevel ?? '',
  //   patrolSessionId: data.patrolSessionId,
  //   attachments: (data.attachments || []).map((a: any) => ({
  //     fileUrl: a.fileUrl.startsWith('http') ? a.fileUrl : `https://${a.fileUrl}`,
  //     fileType: a.fileType,
  //   })),
  // });

  //   const handleEditCase = (item: any) => {
  //     setCaseDialogType('edit');
  //     setEditId(item.id);
  //     setSelectedCase(mapCaseToForm(item));
  //     setOpenCaseDialog(true);
  //   };

  const handleCloseCaseDialog = () => {
    setOpenCaseDialog(false);
  };

  //Patrol Report Dialog helper
  const patrolReportMutation = usePatrolReport();

  const handlePatrolReport = async () => {
    if (!patrol) return;
    try {
      const report = await patrolReportMutation.mutateAsync({
        ...defaultPatrolReportFilter,
        timezone: getUserTimezone(),
        filters: { assignmentId: [patrol.id] },
      });

      const rows = buildPatrolReportRows(report);
      const filename = `PatrolReport_${patrol.name.replace(/\s+/g, '_')}.xlsx`;

      sessionStorage.setItem('patrolReportPreviewData', JSON.stringify({ rows, filename }));

      const w = 1200, h = window.screen.height * 0.9;
      const left = (window.screen.width - w) / 2;
      const top  = (window.screen.height - h) / 2;
      window.open(
        '/report/patrolreport/preview',
        'PatrolReportPreview',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      );
      toast.success('Preview opened in a new tab');
    } catch (error) {
      toast.error('Failed to generate patrol report');
      console.error('Error generating patrol report:', error);
    }
  };

  if (!patrol) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }
  // console.log('patrol', patrol);

  return (
    <>
      <Box p={isMobile ? 2 : 3}>
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3}>
          {/* ================= LEFT PANEL ================= */}
          <Box
            flexShrink={0}
            width={isMobile ? '100%' : 360}
            borderRadius={2}
            p={2}
            display="flex"
            flexDirection="column"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              minHeight: isMobile
                ? 'auto'
                : `calc(100vh - ${(settings.TopbarHeight ?? 70) * 2}px)`,
            }}
          >
            {/* Back Button */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => dispatch(SelectPatrolAssign(null))}
              >
                Back
              </Button>
              <Button variant="outlined" color="primary" size="small" onClick={handlePatrolReport}>
                Generate Report
              </Button>
            </Box>

              {/* Name */}
              <Typography fontWeight={700} fontSize={20}>
                {patrol.name}
              </Typography>


            {/* Description */}
            <Box mt={1}>
              <Box
                sx={{
                  mt: 1,
                  fontSize: 13,
                  lineHeight: '1.4em',
                  minHeight: '4.2em', // 1.4em * 3 lines
                  maxHeight: '4.2em',
                  overflowY: 'auto',
                  pr: 0.5, // space for scrollbar
                  '&::-webkit-scrollbar': {
                    width: 4,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.divider,
                    borderRadius: 2,
                  },
                }}
              >
                <Typography fontSize={13}>{patrol.description || '-'}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            {/* Dates */}
            <Box sx={{ cursor: 'pointer' }} onClick={() => setOpenSchedule(true)}>
              <Stack spacing={1}>
                <InfoRow label="Active From" value={formatDate(patrol.startDate)} />
                <InfoRow label="Until" value={formatDate(patrol.endDate)} />
              </Stack>
            </Box>
            <Divider sx={{ my: 2 }} />
            {/* Route */}
            <Box mt={2} sx={{ cursor: 'pointer' }} onClick={() => setOpenRoute(true)}>
              <Typography fontSize={12} color="text.secondary" textAlign="center" mb={0.5}>
                Route
              </Typography>

              <Typography fontWeight={600} textAlign="center" mb={1}>
                {route?.name ?? 'Unknown Route'}
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                {/* LEFT */}
                <Box minWidth={80} textAlign="right">
                  <Typography fontSize={13} color="text.secondary">
                    From {route?.startAreaName ?? '-'}
                  </Typography>
                </Box>

                {/* MIDDLE */}
                <Box flex={1} position="relative" height={20}>
                  {/* dashed line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed',
                      borderColor: theme.palette.text.primary,
                      transform: 'translateY(-50%)',
                    }}
                  />

                  {/* centered label */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      px: 1,
                      backgroundColor: theme.palette.background.paper,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Typography fontSize={12} color="text.secondary">
                      {areaCount} Area{areaCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                {/* RIGHT */}
                <Box minWidth={80} textAlign="left">
                  <Typography fontSize={13} color="text.secondary">
                    To {route?.endAreaName ?? '-'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            {/* Securities */}
            <Box display="flex" flexDirection="column" flexGrow={isMobile ? 0 : 1}>
              <Typography fontWeight={600} mb={1}>
                Securities
              </Typography>

              {/* LIST CONTAINER */}
              <Box
                sx={{
                  overflowY: isMobile ? 'auto' : 'visible',
                  maxHeight: isMobile ? 200 : 'none', // ± 3 items
                  pr: isMobile ? 0.5 : 0,
                }}
              >
                <Stack spacing={1}>
                  {patrol.securities?.map((sec: SecurityType) => (
                    <Box
                      key={sec.id}
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                      p={1}
                      borderRadius={1}
                      sx={{ backgroundColor: theme.palette.action.hover, cursor: 'pointer' }}
                      onClick={() => onSecurityClick(sec)}
                    >
                      <Avatar sx={{ width: 32, height: 32 }}>{sec.name.charAt(0)}</Avatar>

                      <Box>
                        <Typography fontWeight={600} fontSize={14}>
                          {sec.name}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          {sec.identityId}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {!patrol.securities?.length && (
                    <Typography fontSize={12} color="text.secondary">
                      No securities assigned
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Spacer otomatis kalau list sedikit */}
              {!isMobile && <Box flexGrow={1} />}
            </Box>
          </Box>

          {/* ================= RIGHT PANEL ================= */}
          <Box
            flex={1}
            borderRadius={2}
            p={2}
            sx={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            {/* Title */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography fontWeight={700} fontSize={18}>
                Patrol Cases
              </Typography>
            </Box>

            {/* List */}
            {isCaseLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: isMobile ? 'auto' : 'calc(100vh - 220px)',
                  overflowY: 'auto',
                }}
              >
                {patrolCaseData.length > 0 ? (
                  patrolCaseData.map((item, index) => (
                    <Box
                      key={item.id}
                      sx={{
                        backgroundColor: index % 2 ? 'grey.50' : 'transparent',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <PatrolCaseListItem
                        data={item}
                        onClick={(c) => {
                          setSelectedCase(c);
                          setOpenCaseDialog(true);
                          //   handleEditCase(c);
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography fontSize={13} color="text.secondary" textAlign="center" mt={2}>
                    No patrol cases found
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* ================= SCHEDULE DIALOG ================= */}
      <PatrolScheduleCalendarDialog
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        startDate={patrol.startDate}
        endDate={patrol.endDate}
        timeGroups={timeGroups}
      />

      {/* ================= ROUTE DIALOG ================= */}
      <PatrolRouteDetailDialog open={openRoute} route={route} onClose={() => setOpenRoute(false)} />
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
      {/* <PatrolCaseOverview data={selectedCase} /> */}
    </>
  );
};

export default PatrolReportContent;
