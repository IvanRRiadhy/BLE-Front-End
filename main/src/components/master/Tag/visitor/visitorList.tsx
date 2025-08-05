import { useEffect, useMemo } from 'react';
import { Box, List } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { fetchVisitor, fetchVisitorDT, masterVisitorType, SelectVisitor } from 'src/store/apps/crud/visitor';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import VisitorListItem from './visitorListItem';
import { fetchTrxVisitor, SelectTrxVisitor } from 'src/store/apps/crud/trxVisitor';

const VisitorList = () => {
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchVisitorDT(visitorFilter));
    dispatch(fetchTrxVisitor());
  }, [dispatch]);

  const visitors = useSelector((state: RootState) =>state.visitorReducer.visitors);
  const trxVisitors = useSelector((state: RootState) => state.TrxVisitorReducer.TrxVisitors);

  const active = useSelector((state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor);

  return (
    <List>
      <Box sx={{ height: { lg: 'calc(100vh - 350px)', md: '100vh' }, maxHeight: '800px', overflow: 'auto' }}>
        {trxVisitors.map((trx) => (
          <VisitorListItem
            key={trx.id}
            active={trx === active}
            trx={trx}
            onTagClick={() => {
              dispatch(SelectTrxVisitor(trx.id));
            }}
          />
        ))}
      </Box>
    </List>
  );
};

export default VisitorList;
