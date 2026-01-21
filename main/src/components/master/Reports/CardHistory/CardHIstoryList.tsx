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
} from '@mui/material';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'src/store/Store';
import { useCardHistory, useCardUsage } from 'src/hooks/useCardRecord';
import { CardHistoryType, CardUsageType } from 'src/store/apps/crud/cardRecord';
import CardUsageItem from './CardUsageItem';
import CardHistoryItem from './CardHistoryItem';
import { IconStatusChange, IconTransferVertical } from '@tabler/icons-react';

const CardHistoryList = () => {
  const dispatch = useDispatch();
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

      <Grid
        p={3}
        container
        spacing={3}
        sx={{
          maxHeight: '440px',
          overflowY: 'auto',
        }}
      >
        {cardUsageData.length === 0 && !isLoading && <Typography>No card usage found.</Typography>}
        {cardUsageData.map((item) => (
          <CardUsageItem
            key={item.cardId}
            data={item}
            onClick={() => setSelectedCard(item.cardId)}
          />
        ))}
      </Grid>
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
            <CircularProgress />
          ) : (
            <Grid container spacing={2}>
              {sortedCardHistory.map((history, index: number) => {
                const chronologicalIndex = sortNewestFirst ? total - index - 1 : index;

                const isLatest = sortNewestFirst
                  ? history.checkinAt === sortedCardHistory[0]?.checkinAt
                  : history.checkinAt ===
                    sortedCardHistory[sortedCardHistory.length - 1]?.checkinAt;

                return (
                  <Grid key={history.checkinAt} size={{ xs: 12, sm: 6, md: 4 }}>
                    <CardHistoryItem
                      history={history}
                      index={chronologicalIndex}
                      isLatest={isLatest}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CardHistoryList;
