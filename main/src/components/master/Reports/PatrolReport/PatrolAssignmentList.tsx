import { useEffect, useState, useRef } from 'react';
import { Box, List, Skeleton, ListItemButton, ListItemText, Stack } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import PatrolAssignmentListItem from './PatrolAssignmentListItem';
import { defaultPatrolAssignmentFilter } from 'src/store/apps/defaultForm';
import { usePatrolAssignList } from 'src/hooks/usePatrolRoute';
import { PatrolAssignType, SelectPatrolAssign, UpdateAssignmentFilter } from 'src/store/apps/crud/patrolRoute';

const SKELETON_ROWS = 5;

const PatrolAssignmentList = () => {
  const patrolAssignmentFilter = useSelector(
    (state: RootState) => state.PatrolRouteReducer.patrolAssignFilter,
  );
  const active = useSelector((state: RootState) => state.PatrolRouteReducer.selectedPatrolAssign);
  const dispatch = useDispatch();

  const {
    data: patrolAssignmentResponse,
    isLoading,
    isFetching,
  } = usePatrolAssignList({
    ...patrolAssignmentFilter,
    length: 999, // Get all time groups
  });
  const patrolAssignmentData = patrolAssignmentResponse?.data || [];

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Update filter on mount to ensure we get all records
  useEffect(() => {
    dispatch(
      UpdateAssignmentFilter({
        ...defaultPatrolAssignmentFilter,
        length: 999,
      }),
    );
  }, [dispatch]);

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
      <List>
        <Box
          ref={scrollBoxRef}
          sx={{
            height: { lg: '90vh', md: '100vh' },
            maxHeight: '715px',
            overflow: 'auto',
          }}
        >
          {!showLoading && patrolAssignmentData.length > 0 ? (
            patrolAssignmentData.map((patrolAssignment: PatrolAssignType) => (
              <PatrolAssignmentListItem
                key={patrolAssignment.id}
                assignment={patrolAssignment}
                active={active}
                onAssignmentClick={() => {
                    console.log('clicked', patrolAssignment);
                    dispatch(SelectPatrolAssign(patrolAssignment));
                }}
              />
            ))
          ) : showLoading ? (
            renderSkeletonItems(SKELETON_ROWS)
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>No time groups found</Box>
          )}
        </Box>
      </List>
    </>
  );
};

export default PatrolAssignmentList;