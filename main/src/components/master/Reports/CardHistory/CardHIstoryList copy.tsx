import { useEffect, useMemo, useState } from 'react';
import {
  Backdrop,
  Box,
  CircularProgress,
  List,
  Skeleton,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  Divider,
  Grid2 as Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
} from '@mui/material';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector, RootState } from 'src/store/Store';
import { useCardHistory, useCardUsage } from 'src/hooks/useCardRecord';
import { CardHistoryType, CardUsageType } from 'src/store/apps/crud/cardRecord';
import { IconStatusChange, IconTransferVertical } from '@tabler/icons-react';
import { formatFullDateTime } from 'src/utils/time';

const CardHistoryTable = () => {
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.settings.isLanguage);
  const lang = language === 'id' ? 'id' : 'en';

  const { data: cardUsageData = [], isLoading, isFetching } = useCardUsage();
  const [openHistory, setOpenHistory] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const [selectedCard, setSelectedCard] = useState<string>('');
  const { data: cardHistoryData = [], isLoading: isHistoryLoading } = useCardHistory(selectedCard, {
    enabled: !!selectedCard, // 👈 IMPORTANT (step 2)
  });

  const sortedCardHistory = useMemo(() => {
    const sorted = [...cardHistoryData].sort((a, b) => {
      const timeA = new Date(a.checkinAt).getTime();
      const timeB = new Date(b.checkinAt).getTime();
      return timeA - timeB; // oldest → newest
    });

    return sortNewestFirst ? [...sorted].reverse() : sorted;
  }, [cardHistoryData, sortNewestFirst]);

  useEffect(() => {
    if (cardHistoryData.length > 0) {
      setOpenHistory(true);
    }
  }, [cardHistoryData]);
  const total = sortedCardHistory.length;
  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Card Usage List
      </Typography>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          height: '750px',
          maxHeight: '750px',
          overflowY: 'auto',
          bgcolor: 'background.paper',
        }}
      >
        <Table stickyHeader aria-label="card usage table" sx={{ whiteSpace: 'nowrap' }}>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="h6">Card Number</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Last Used By</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Is Active</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Usage Count</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : cardUsageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body1" sx={{ p: 3 }}>
                    No card usage found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              cardUsageData.map((item, index) => (
                <TableRow
                  key={item.cardId}
                  hover
                  onClick={() => {
                    console.log(item);
                    setSelectedCard(item.cardId);
                  }}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: (theme) =>
                      index % 2 === 0 ? theme.palette.action.hover : theme.palette.background.paper,
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.cardNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.lastUsedBy || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status || 'Inactive'}
                      color={item.status === 'Active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.totalUsage}
                      color="secondary"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* ================= CARD HISTORY DIALOG ================= */}
      <Dialog
        open={openHistory}
        onClose={() => {
          setOpenHistory(false);
          setSelectedCard('');
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'left',
            gap: 1,
          }}
        >
          <Typography variant="h6">Card History</Typography>

          {/* <Button
            size="small"
            variant="outlined"
            onClick={() => setSortNewestFirst((prev) => !prev)}
          >
            {sortNewestFirst ? 'Newest First' : 'Oldest First'}
          </Button> */}
          <Tooltip title={sortNewestFirst ? 'Sort Oldest First' : 'Sort Newest First'}>
            <IconButton color="primary" onClick={() => setSortNewestFirst((prev) => !prev)}>
              <IconTransferVertical />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent dividers>
          {isHistoryLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader aria-label="card history table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="h6">Used By</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6">Used By Type</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6">Start Time</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6">End Time</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedCardHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body1" sx={{ p: 3 }}>
                          No history found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCardHistory.map((history, index: number) => {
                      const isActive = !history.checkoutAt;

                      const startFormatted = history.checkinAt
                        ? formatFullDateTime(history.checkinAt, lang)
                        : '-';

                      const endFormatted = history.checkoutAt
                        ? formatFullDateTime(history.checkoutAt, lang)
                        : lang === 'id'
                        ? 'Aktif'
                        : 'Active';

                      return (
                        <TableRow
                          key={history.checkinAt}
                          hover
                          sx={{
                            backgroundColor: (theme) =>
                              isActive
                                ? theme.palette.mode === 'light'
                                  ? 'rgba(46, 125, 50, 0.08)'
                                  : 'rgba(46, 125, 50, 0.15)'
                                : index % 2 === 0
                                ? theme.palette.action.hover
                                : theme.palette.background.paper,
                            '&:hover': {
                              backgroundColor: (theme) =>
                                isActive
                                  ? theme.palette.mode === 'light'
                                    ? 'rgba(46, 125, 50, 0.12)'
                                    : 'rgba(46, 125, 50, 0.22)'
                                  : theme.palette.action.selected,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={isActive ? 700 : 400}
                              color={isActive ? 'success.main' : 'text.primary'}
                            >
                              {history.usedBy}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={history.usedByType}
                              color={isActive ? 'success' : 'secondary'}
                              sx={{ borderRadius: '8px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{startFormatted}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={isActive ? 700 : 400}
                              color={isActive ? 'success.main' : 'text.secondary'}
                            >
                              {endFormatted}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CardHistoryTable;
