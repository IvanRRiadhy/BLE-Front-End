import { useEffect, useState, useRef } from 'react';
import { Box, List, Skeleton, ListItemButton, ListItemText, Stack } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import TimeGroupListItem from './TimeGroupListItem';
import { SelectTimeGroup, TimeGroupType, UpdateFilter } from 'src/store/apps/crud/timeGroup';
import { defaultTimeGroupFilter } from 'src/store/apps/defaultForm';
import { useTimeGroupList } from 'src/hooks/useTimeGroup';

const SKELETON_ROWS = 5;

const TimeGroupList = () => {
  const [isManySelect, setIsManySelect] = useState(false);
  const [manySelectTimeGroups, setManySelectTimeGroups] = useState<TimeGroupType[]>([]);

  const timeGroupFilter = useSelector((state: RootState) => state.TimeGroupReducer.timeGroupFilter);
  const active = useSelector((state: RootState) => state.TimeGroupReducer.selectedTimeGroup);
  const dispatch = useDispatch();

  // React Query hook for data fetching
  const {
    data: timeGroupResponse,
    isLoading,
    isFetching,
  } = useTimeGroupList({
    ...timeGroupFilter,
    Length: 999, // Get all time groups
  });

  // Extract data from response
  const timeGroupData = timeGroupResponse?.data || [];

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Update filter on mount to ensure we get all records
  useEffect(() => {
    dispatch(
      UpdateFilter({
        ...defaultTimeGroupFilter,
        Length: 999,
      }),
    );
  }, [dispatch]);

  // Auto-scroll when new items are added (optional - can be removed if not needed)
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

  // Determine if we should show loading state
  const showLoading = isLoading || isFetching;

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
          {!showLoading && timeGroupData.length > 0 ? (
            timeGroupData.map((timeGroup: TimeGroupType) => (
              <TimeGroupListItem
                key={timeGroup.id}
                timeGroup={timeGroup}
                manySelect={isManySelect}
                manySelectTimeGroups={manySelectTimeGroups}
                setManySelectTimeGroups={setManySelectTimeGroups}
                onTimeGroupClick={() => {
                  console.log('Selected Time Group: ', timeGroup);
                  dispatch(SelectTimeGroup(timeGroup));
                }}
                active={active?.id === timeGroup.id}
              />
            ))
          ) : showLoading ? (
            renderSkeletonItems(SKELETON_ROWS)
          ) : (
            // Empty state when no data is available
            <Box sx={{ p: 2, textAlign: 'center' }}>No time groups found</Box>
          )}
          {/* sentinel element for scrollIntoView */}
          <div ref={bottomRef} />
        </Box>
      </List>
    </>
  );
};

export default TimeGroupList;
