import React, { useEffect } from 'react';
import { List } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { fetchVisitor, visitorType, SelectVisitor } from 'src/store/apps/crud/visitor';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import VisitorListItem from './visitorListItem';

const VisitorList = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchVisitor());
  }, [dispatch]);

  const getVisibilityTags = (visitor: visitorType[], filter: string, search: string) => {
    if (filter === 'show_all') {
      return visitor.filter(
        (vis) =>
          vis.name.toLowerCase().includes(search.toLowerCase()) ||
          vis.bleCardNumber.toLowerCase().includes(search.toLowerCase()) ||
          vis.personId.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return visitor.filter(
      (vis) =>
        (vis.gender === filter || vis.status === filter) &&
        (vis.name.toLowerCase().includes(search.toLowerCase()) ||
          vis.bleCardNumber.toLowerCase().includes(search.toLowerCase()) ||
          vis.personId.toLowerCase().includes(search.toLowerCase())),
    );
  };

  const visitors = useSelector((state: RootState) =>
    getVisibilityTags(
      state.visitorReducer.visitors,
      state.visitorReducer.currentFilter,
      state.visitorReducer.visitorSearch,
    ),
  );

  const active = useSelector((state: RootState) => state.visitorReducer.selectedVisitor);

  return (
    <List>
      <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh' }, maxHeight: '800px' }}>
        {visitors.map((visitor) => (
          <VisitorListItem
            key={visitor.id}
            active={visitor === active}
            visitor={visitor}
            onTagClick={() => {
              dispatch(SelectVisitor(visitor.id));
            }}
          />
        ))}
      </Scrollbar>
    </List>
  );
};

export default VisitorList;
