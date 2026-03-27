import { useMemo } from 'react';
import { Box, Button, List, Typography } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import SidebarListItem from './SidebarListItem';
import {
  AlarmLogItem,
  ClearAlarmLogs,
  ClearTrackingLogs,
  ShowAlarmPopup,
  ShowTrackingDetail,
} from 'src/store/apps/tracking/Beacon';
import { CombinedLogItem, useCombinedEnrichedLogs } from 'src/hooks/useTrackingLogs';
import {
  alarmTriggerByIdQuery,
  useAcknowledgeAlarmTrigger,
  useAlarmTriggerByID,
} from 'src/hooks/useAlarmTrigger';
import { AlarmTriggerType, SelectAlarmTrigger } from 'src/store/apps/crud/alarmTrigger';
import { useQueryClient } from '@tanstack/react-query';
// import {
//   ShowAlarmPopup,
//   SelectAlarmTrigger,
// } from 'src/store/apps/monitoring/AlarmUI';

interface SidebarListProps {
  filterType: string[];
  personFilter: {
    Visitor: boolean;
    Member: boolean;
    Security: boolean;
    FocusedPersonOnly: boolean;
  };
}

// ✅ Type guard
function isAlarmLog(item: CombinedLogItem): item is AlarmLogItem {
  return item.type === 'Alarm';
}

const MAX_LIST_ITEMS = 100;

const SidebarList = ({ filterType, personFilter }: SidebarListProps) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const acknowledgeMutation = useAcknowledgeAlarmTrigger();

  const logs = useCombinedEnrichedLogs(100);

  // ✅ Filter logic stays
  const list = logs.filter((x) => {
    if (filterType.length > 0 && !filterType.includes(x.type)) return false;

    if (x.personType === 'Visitor' && !personFilter.Visitor) return false;
    if (x.personType === 'Member' && !personFilter.Member) return false;
    if (x.personType === 'Security' && !personFilter.Security) return false;

    return true;
  });

  // ✅ NEW: async click handler with proper flow
  const handleItemClick = async (item: CombinedLogItem) => {
    if (isAlarmLog(item)) {
      try {
        // 🔥 reuse SAME query config
        let data = await queryClient.fetchQuery(alarmTriggerByIdQuery(item.triggerId.toLowerCase()));

        let trigger = data;
        console.log("ALarm By Id Response : ", data);
        if (!trigger) return;
        
        // 🔥 check real backend state
        if (trigger.action?.toLowerCase() === 'idle') {
          await acknowledgeMutation.mutateAsync(trigger.id);

          // 🔥 refetch updated
          data = await queryClient.fetchQuery(alarmTriggerByIdQuery(item.triggerId));

          trigger = data;
        }
        console.log("Selected Trigger", trigger, item)
        dispatch(ShowAlarmPopup(item));
        dispatch(SelectAlarmTrigger(trigger));
      } catch (error) {
        console.error(error);
      }
    } else {
      dispatch(ShowTrackingDetail(item));
    }
  };

  return (
    <List>
      <Button
        fullWidth
        variant="outlined"
        color="secondary"
        sx={{ mb: 2 }}
        onClick={() => {
          dispatch(ClearTrackingLogs());
          dispatch(ClearAlarmLogs());
        }}
      >
        Clear All
      </Button>

      <Scrollbar
        sx={{
          height: { lg: 'calc(100vh - 200px)', md: '100vh' },
          maxHeight: '800px',
        }}
      >
        {list.map((item) => (
          <SidebarListItem key={item.id} item={item} onItemClick={() => handleItemClick(item)} />
        ))}

        {list.length >= MAX_LIST_ITEMS && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Showing latest {MAX_LIST_ITEMS} items (oldest items automatically removed)
            </Typography>
          </Box>
        )}
      </Scrollbar>
    </List>
  );
};

export default SidebarList;
