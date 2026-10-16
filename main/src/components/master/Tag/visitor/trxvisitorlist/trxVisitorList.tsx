import { useEffect } from 'react';
import {
  Box,
  List,
  Skeleton,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Stack,
} from '@mui/material';
import { useInfiniteTrxVisitorList } from 'src/hooks/useVisitorTrx';
import { useInView } from 'react-intersection-observer';
import TrxVisitorListItem from './trxVisitorListItem';
import { SelectTrxVisitor, UpdateFilter, TrxVisitorType } from 'src/store/apps/crud/trxVisitor';
import { defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import { useDispatch, useSelector, RootState } from 'src/store/Store';

const SKELETON_ROWS = 5;

const VisitorList = () => {
  const dispatch = useDispatch();

  // 🔹 Redux filter and selected state
  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter,
  );
  const selectedTrxVisitor = useSelector(
    (state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor,
  );

  // 🔹 React Query infinite fetching
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteTrxVisitorList(trxVisitorFilter, 50);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Reset filter to default on mount (similar to tagList.tsx)
  useEffect(() => {
    dispatch(UpdateFilter({ ...defaultTrxVisitorFilter }));
  }, [dispatch]);

  // 🔹 Derived visitors list from pages
  const trxVisitors = data?.pages.flatMap((page) => page.data) ?? [];
  const active = trxVisitors?.find((trx: TrxVisitorType) => trx.id === selectedTrxVisitor?.id);

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

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: '75vh', height: { lg: 'calc(100vh - 220px)', md: '100vh' } }}>
      <List sx={{ px: 0 }}>
        {isLoading
          ? renderSkeletonItems(SKELETON_ROWS)
          : trxVisitors.map((trx) => (
              <TrxVisitorListItem
                key={trx.id}
                active={trx === active || trx.id === selectedTrxVisitor?.id}
                trx={trx}
                onTagClick={() => {
                  dispatch(SelectTrxVisitor(trx));
                }}
              />
            ))}

        {isFetchingNextPage && renderSkeletonItems(3)}

        {hasNextPage && <div ref={ref} style={{ height: '20px' }} />}
      </List>
    </Box>
  );
};

export default VisitorList;