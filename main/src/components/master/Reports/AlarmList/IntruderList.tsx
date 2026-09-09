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
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Button,
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
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

  // Search and personType filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [personTypeFilter, setPersonTypeFilter] = useState<'All' | 'Visitor' | 'Member'>('All');

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

  // Counts for each person type
  const counts = useMemo(() => {
    let visitor = 0;
    let member = 0;
    intruderData.forEach((i) => {
      const pt = i.personType?.toLowerCase();
      if (pt === 'visitor') visitor++;
      else if (pt === 'member') member++;
    });
    return {
      all: intruderData.length,
      visitor,
      member,
    };
  }, [intruderData]);

  const filterOptions: { label: string; value: 'All' | 'Visitor' | 'Member'; count: number }[] = [
    { label: 'All', value: 'All', count: counts.all },
    { label: 'Visitor', value: 'Visitor', count: counts.visitor },
    { label: 'Member', value: 'Member', count: counts.member },
  ];

  // Filtered intruders based on search and personType
  const filteredIntruders = useMemo(() => {
    return intruderData.filter((intruder) => {
      // 1. Person Type filter
      if (personTypeFilter !== 'All') {
        if (intruder.personType?.toLowerCase() !== personTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = intruder.personName?.toLowerCase().includes(q);
        const cardMatch = intruder.cardNumber?.toLowerCase().includes(q);
        const beaconMatch = intruder.beaconId?.toLowerCase().includes(q);
        if (!nameMatch && !cardMatch && !beaconMatch) {
          return false;
        }
      }

      return true;
    });
  }, [intruderData, personTypeFilter, searchQuery]);

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
      <List
        sx={{
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
        }}
      >
        {/* Sticky Header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box px={2} pt={2} pb={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" fontWeight={800}>
                Intruders
              </Typography>
              {!loading && (
                <Chip
                  label={`${filteredIntruders.length} / ${intruderData.length}`}
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '11px', height: 22 }}
                />
              )}
            </Stack>
          </Box>

          {/* Search Input */}
          <Box px={2} pb={1.2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search intruder, card, beacon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={16} color="#64748B" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                      <IconX size={14} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  borderRadius: '8px',
                  fontSize: '13px',
                  bgcolor: 'action.hover',
                  '& fieldset': { borderColor: 'divider' },
                },
              }}
            />
          </Box>

          {/* Person Type Filter Chips */}
          <Box px={2} pb={1.5}>
            <Stack direction="row" spacing={0.8} sx={{ overflowX: 'auto', py: 0.2 }}>
              {filterOptions.map((opt) => {
                const isSelected = personTypeFilter === opt.value;
                return (
                  <Chip
                    key={opt.value}
                    label={`${opt.label} (${opt.count})`}
                    size="small"
                    clickable
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    onClick={() => setPersonTypeFilter(opt.value)}
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '11px',
                      height: 24,
                      borderRadius: '6px',
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
          <Divider />
        </Box>

        {/* Scrollable Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {!loading && filteredIntruders.length > 0 ? (
            filteredIntruders.map((intruder) => (
              <IntruderListItem
                key={intruder.id}
                active={intruder.id === selectedIntruder?.id}
                intruder={intruder}
                onTagClick={() => handleClick(intruder)}
              />
            ))
          ) : !loading && intruderData.length > 0 && filteredIntruders.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                No intruders match the criteria
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setSearchQuery('');
                  setPersonTypeFilter('All');
                }}
                sx={{ mt: 1, textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
              >
                Reset Search & Filter
              </Button>
            </Box>
          ) : !loading && intruderData.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No intruders found
              </Typography>
            </Box>
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

export default IntruderList;
