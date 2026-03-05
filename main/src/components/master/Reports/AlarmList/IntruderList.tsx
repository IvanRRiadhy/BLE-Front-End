import { useEffect, useMemo, useState, useRef } from 'react';
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
} from '@mui/material';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'src/store/Store';
import IntruderListItem from './IntruderListItem';
import { IntruderType, SelectIntruder } from 'src/store/apps/crud/alarmTrigger';
import { useAllIntruders } from 'src/hooks/useAlarmTrigger';
import { useAllVisitor, useVisitorList } from 'src/hooks/useVisitor';
import { defaultMemberFilter, defaultVisitorFilter } from 'src/store/apps/defaultForm';
import { SelectVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import { useAllMembers, useMemberList } from 'src/hooks/useMember';
import { memberType, SelectMember } from 'src/store/apps/crud/member';
import { useSearchParams } from 'react-router-dom';

const SKELETON_ROWS = 5;

const IntruderList = () => {
  const dispatch = useDispatch();

  const { data: intruderData = [], isLoading, isFetching } = useAllIntruders();

  const selectedIntruder = useSelector((state) => state.alarmTriggerReducer.selectedIntruder);
  const searchParams = new URLSearchParams(window.location.search);
  const autoSelectDone = useRef(false);
  // Fetch all visitors and members upfront
  const { data: allVisitors } = useAllVisitor();

  const { data: allMembers } = useAllMembers();

  // Create lookup maps for quick access
  const visitorMap = useMemo(() => {
    if (!allVisitors) return {};
    return allVisitors.reduce((acc: { [key: string]: VisitorType }, visitor) => {
      acc[visitor.id] = visitor;
      //   acc[visitor.personGuid] = visitor;
      return acc;
    }, {});
  }, [allVisitors]);

  const memberMap = useMemo(() => {
    if (!allMembers) return {};
    return allMembers.reduce((acc: { [key: string]: memberType }, member) => {
      acc[member.id] = member;
      //   acc[member.personGuid] = member;
      return acc;
    }, {});
  }, [allMembers]);

  useEffect(() => {
    if (autoSelectDone.current) return;
    if (!intruderData?.length) return;

    const visitorId = searchParams.get('visitorId');
    const memberId = searchParams.get('memberId');

    if (!visitorId && !memberId) return;

    const matchedIntruder = intruderData.find((intruder) => {
      if (visitorId && intruder.personType === 'Visitor') {
        return intruder.visitorId === visitorId || intruder.personGuid === visitorId;
      }
      if (memberId && intruder.personType === 'Member') {
        return intruder.memberId === memberId || intruder.personGuid === memberId;
      }
      return false;
    });

    if (matchedIntruder) {
      handleClick(matchedIntruder);
      autoSelectDone.current = true;
    }
  }, [intruderData, searchParams]);

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
              </Box>
            </Stack>
          </ListItemText>
        </ListItemButton>
      ))}
    </>
  );

  const handleClick = (intruder: IntruderType) => {
    dispatch(SelectIntruder(intruder));
    console.log('Selected Intruder:', intruder);
    // Use the pre-fetched data from maps
    switch (intruder.personType) {
      case 'Visitor':
        const visitorId = intruder.visitorId || intruder.personGuid;
        const visitorData = visitorMap[visitorId];
        if (visitorData) {
          dispatch(SelectVisitor(visitorData));
        }
        break;
      case 'Member':
        const memberId = intruder.memberId || intruder.personGuid;
        const memberData = memberMap[memberId];
        if (memberData) {
          dispatch(SelectMember(memberData));
        }
        break;
    }
  };

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
          <Box p={2}>
            <Typography variant="h4" fontWeight={800}>
              Intruders
            </Typography>
          </Box>
          <Divider />
          {!loading && intruderData.length > 0
            ? intruderData.map((intruder) => (
                <IntruderListItem
                  key={intruder.id}
                  active={intruder.id === selectedIntruder?.id}
                  intruder={intruder}
                  onTagClick={() => handleClick(intruder)}
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

export default IntruderList;
