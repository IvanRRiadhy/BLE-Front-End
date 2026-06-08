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
} from '@mui/material';
import { createPortal } from 'react-dom';
import { useTrxVisitorList, useAllTrxVisitor, useTrxVisitorStatus } from 'src/hooks/useVisitorTrx';
import { defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import TrxVisitorListItem from './trxVisitorListItem';
import { SelectTrxVisitor } from 'src/store/apps/crud/trxVisitor';
import { useDispatch, useSelector } from 'src/store/Store';

const SKELETON_ROWS = 5;

const VisitorList = () => {
  const dispatch = useDispatch();
  
  // Use React Query hooks instead of Redux
  const { data: paginatedData, isLoading, isFetching } = useTrxVisitorList();
  const { data: allVisitors } = useAllTrxVisitor();
  const { hasLoaded } = useTrxVisitorStatus();

  // Use either paginated data or all visitors based on your needs
  const trxVisitors = useMemo(() => {
    return paginatedData?.data || allVisitors || [];
  }, [paginatedData, allVisitors]);
  const selectedTrxVisitor = useSelector((state) => state.TrxVisitorReducer.SelectedTrxVisitor);


  const renderSkeletonItems = (count: number) => (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <ListItemButton key={`skeleton-${idx}`} sx={{ mb: 1 }}>
          <ListItemAvatar>
            <Skeleton variant="circular" width={40} height={40} />
          </ListItemAvatar>
          <ListItemText>
            <Stack direction="row" gap="10px" alignItems="center">
              <Box mr="auto">
                <Skeleton variant="text" width={160} height={22} />
                <Skeleton variant="text" width={120} height={18} />
                <Skeleton variant="text" width={100} height={18} />
              </Box>
            </Stack>
          </ListItemText>
        </ListItemButton>
      ))}
    </>
  );

  const loading = isLoading || isFetching;

  return (
    <>
      <List>
        <Box
          sx={{
            height: { lg: 'calc(100vh - 220px)', md: '100vh' },
            maxHeight: '75vh',
            overflow: 'auto',
          }}
        >
          {hasLoaded && trxVisitors.length > 0 ? (
            trxVisitors.map((trx) => (
              <TrxVisitorListItem
                key={trx.id}
                active={trx.id === selectedTrxVisitor?.id}
                trx={trx}
                onTagClick={() => {
                  dispatch(SelectTrxVisitor(trx.id));
                }}
              />
            ))
          ) : (
            renderSkeletonItems(SKELETON_ROWS)
          )}
        </Box>
      </List>
      {loading &&
        createPortal(
          <Backdrop
            open={loading}
            sx={{
              color: '#fff',
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>,
          document.body,
        )}
    </>
  );
};

export default VisitorList;