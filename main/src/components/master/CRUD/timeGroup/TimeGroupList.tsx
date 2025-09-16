import { useEffect, useState, useRef } from 'react';
import { Box, List, Skeleton, ListItemButton, ListItemText, Stack } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import TimeGroupListItem from './TimeGroupListItem';
import { fetchTimeGroupDT, SelectTimeGroup, TimeGroupType, UpdateFilter } from 'src/store/apps/crud/timeGroup';
import { defaultTimeGroupFilter } from 'src/store/apps/defaultForm';

const SKELETON_ROWS = 5;

const TimeGroupList = () => {
  const [isManySelect, setIsManySelect] = useState(false);
  const [manySelectTimeGroups, setManySelectTimeGroups] = useState<TimeGroupType[]>([]);
  const timeGroupFilter = useSelector((state: RootState) => state.TimeGroupReducer.timeGroupFilter);
  const hasLoaded = useSelector((state: RootState) => state.TimeGroupReducer.hasLoaded);

  const dispatch = useDispatch();
  const timeGroupData = useSelector((state: RootState) => state.TimeGroupReducer.timeGroups);
  const active = useSelector((state: RootState) => state.TimeGroupReducer.selectedTimeGroup);

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dispatch(UpdateFilter({ ...defaultTimeGroupFilter, Length: 999 }));
    dispatch(fetchTimeGroupDT({ ...defaultTimeGroupFilter, Length: 999 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchTimeGroupDT({ ...timeGroupFilter, Length: 999 }));
  }, [timeGroupFilter, dispatch]);

  // Auto-scroll when new items are added
  useEffect(() => {
    if (timeGroupData.length > 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeGroupData]);

  const renderSkeletonItems = (count: number) => (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <ListItemButton key={`skeleton-${idx}`} sx={{ mb: 1 }}>
          <ListItemText>
            <Stack direction="row" gap="10px" alignItems="center">
              <Box mr="auto">
                <Skeleton variant="text" width={160} height={22} />
                <Skeleton variant="text" width={120} height={18} />
              </Box>
            </Stack>
          </ListItemText>
        </ListItemButton>
      ))}
    </>
  );

  return (
    <>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="content-between"
        alignItems="center"
        gap={1}
        sx={{ ml: 2 }}
      ></Box>
      <List>
        <Box
          ref={scrollBoxRef}
          sx={{
            height: { lg: 'calc(100vh - 260px)', md: '100vh' },
            maxHeight: '620px',
            overflow: 'auto',
          }}
        >
          {hasLoaded
            ? timeGroupData.map((timeGroup: TimeGroupType) => (
                <TimeGroupListItem
                  key={timeGroup.id}
                  timeGroup={timeGroup}
                  manySelect={isManySelect}
                  manySelectTimeGroups={manySelectTimeGroups}
                  setManySelectTimeGroups={setManySelectTimeGroups}
                  onTimeGroupClick={() => {
                    dispatch(SelectTimeGroup(timeGroup));
                  }}
                  active={active?.id === timeGroup.id}
                />
              ))
            : renderSkeletonItems(SKELETON_ROWS)}
          {/* sentinel element for scrollIntoView */}
          <div ref={bottomRef} />
        </Box>
      </List>
    </>
  );
};

export default TimeGroupList;
