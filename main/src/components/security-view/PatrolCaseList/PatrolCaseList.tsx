import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { useNavigate } from 'react-router';
import { useAllPatrolCase } from 'src/hooks/usePatrolCase';
import PatrolCaseListItem from '../PatrolAssignment/PatrolAssignmentList/PatrolCaseListItem';
import PatrolCaseOverview from './PatrolCaseOverview';
import CloseIcon from '@mui/icons-material/Close';
import { getCaseStatusColor } from 'src/utils/caseStatus';

const PatrolCaseList = () => {
  const theme = useTheme();
  const customizer = useSelector((state: RootState) => state.customizer);
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: patrolCaseData = [], isLoading: isCaseLoading } = useAllPatrolCase();
  const [openOverview, setOpenOverview] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  console.log('Case Data', patrolCaseData);
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  const listHeight = `calc(100% - ${customizer.TopbarHeight}px)`;
  return (
    <>
      <Box
        sx={{
          width: '100%',
          height: listHeight,
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
                      setOpenOverview(true);
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
      <Dialog open={openOverview} onClose={() => setOpenOverview(false)} fullWidth maxWidth="lg">
        <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 0.5 : 2}
            alignItems={isMobile ? 'flex-start' : 'center'}
          >
            {/* Title */}
            <Typography fontWeight={800} fontSize={24}>Patrol Case Overview</Typography>
            {/* Status Chip */}
            <Chip
              size="small"
              label={selectedCase?.caseStatus}
              color={getCaseStatusColor(selectedCase?.caseStatus)}
            />
          </Stack>
          {/* Patrol Case Overview */}
          <IconButton onClick={() => setOpenOverview(false)}>
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
    </>
  );
};

export default PatrolCaseList;
