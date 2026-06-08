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
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  fetchVisitor,
  fetchVisitorDT,
  masterVisitorType,
  SelectVisitor,
} from 'src/store/apps/crud/visitor';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import TestRecordListItem from './TestRecordListItem';
import {
  fetchTrxVisitor,
  fetchTrxVisitorDT,
  SelectTrxVisitor,
  UpdateFilter,
} from 'src/store/apps/crud/trxVisitor';
import { defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import { createPortal } from 'react-dom';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';

const SKELETON_ROWS = 5;

const TestRecordList = () => {
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter,
  );
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const hasLoaded = useSelector((state: RootState) => state.TrxVisitorReducer.hasLoaded);

  useEffect(() => {
    dispatch(UpdateFilter({ ...defaultTrxVisitorFilter, Length: 999 }));
    setLoading(true);
    try {
      dispatch(fetchTrxVisitorDT({ ...defaultTrxVisitorFilter, Length: 999 }));
      // dispatch(fetchBuildings());
      // dispatch(fetchFloors());
      // dispatch(fetchFloorplan());
      // // dispatch(fetchMaskedAreas());
    } catch (error) {
      console.error('Error fetching visitors:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch]);
  useEffect(() => {
    setLoading(true);
    try {
      dispatch(fetchTrxVisitorDT({ ...trxVisitorFilter, Length: 999 }));
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [trxVisitorFilter, dispatch]);

  const visitors = useSelector((state: RootState) => state.visitorReducer.visitors);
  const trxVisitors = useSelector((state: RootState) => state.TrxVisitorReducer.TrxVisitors);

  const active = useSelector((state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor);
  useEffect(() => {
    console.log('active', active);
  }, [active]);

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
    <>
      <List>
        <Box
          sx={{
            height: { lg: 'calc(100vh - 220px)', md: '100vh' },
            maxHeight: '75vh',
            overflow: 'auto',
          }}
        >
          {hasLoaded
            ? trxVisitors.map((trx) => (
                <TestRecordListItem
                  key={trx.id}
                  active={trx.id === active.id}
                  trx={trx}
                  onTagClick={() => {
                    dispatch(SelectTrxVisitor(trx.id));
                  }}
                />
              ))
            : renderSkeletonItems(SKELETON_ROWS)}
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

export default TestRecordList;
