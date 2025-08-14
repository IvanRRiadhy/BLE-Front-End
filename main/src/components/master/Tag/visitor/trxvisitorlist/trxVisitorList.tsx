import { useEffect, useMemo, useState } from 'react';
import { Backdrop, Box, CircularProgress, List } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  fetchVisitor,
  fetchVisitorDT,
  masterVisitorType,
  SelectVisitor,
} from 'src/store/apps/crud/visitor';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import TrxVisitorListItem from './trxVisitorListItem';
import {
  fetchTrxVisitor,
  fetchTrxVisitorDT,
  SelectTrxVisitor,
  UpdateFilter,
} from 'src/store/apps/crud/trxVisitor';
import { defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import { createPortal } from 'react-dom';
import { ca } from 'date-fns/locale';

const VisitorList = () => {
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter,
  );
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    dispatch(UpdateFilter({...defaultTrxVisitorFilter, Length: 999}));
    setLoading(true);
    try {
      dispatch(fetchTrxVisitorDT({...defaultTrxVisitorFilter, Length: 999}));
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
    dispatch(fetchTrxVisitorDT({...trxVisitorFilter, Length: 999}));
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
    console.log("active", active);
  },[active])

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
          {trxVisitors.map((trx) => (
            <TrxVisitorListItem
              key={trx.id}
              active={trx.id === active.id}
              trx={trx}
              onTagClick={() => {
                dispatch(SelectTrxVisitor(trx.id));
              }}
            />
          ))}
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
