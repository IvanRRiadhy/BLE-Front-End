import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  Typography,
} from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import SidebarListItem from './SidebarListItem';
import { AlarmLogItem, ClearAlarmLogs, ClearTrackingLogs, SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { CombinedLogItem, useCombinedEnrichedLogs, useEnrichedTrackingLogs, useTrackingLogs } from 'src/hooks/useTrackingLogs';

interface SidebarListProps {
  filterType: string[]; // '', 'All', 'Tracking', 'Alarm'
}

type ListType = {
  id: string;
  device: string;
  target: string;
  image: string;
  dmac: string;
  floor: string;
  area: string;
  alarmType?: string;
  time: string;
  status?: string;
  type: 'Alarm' | 'Tracking';
};

// Helper function to convert beacon object to array
function isAlarmLog(item: CombinedLogItem): item is AlarmLogItem {
  return item.type === 'Alarm';
}

// Maximum number of items to keep in the list
const MAX_LIST_ITEMS = 100;

const SidebarList = ({ filterType }: SidebarListProps) => {
  const dispatch = useDispatch();

  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CombinedLogItem | null>(null);
  // const [list, setList] = useState<ListType[]>([]);
  const trackingLogs = useEnrichedTrackingLogs();
  const logs = useCombinedEnrichedLogs(100);
const list =
  filterType.length > 0
    ? logs.filter((x) => filterType.includes(x.type))
    : logs;

  // Get beaconsByTopic from Redux - now it's an object of objects
  const beaconsByTopicObj = useSelector((s: RootState) => s.BeaconReducer.beaconsByTopic || {});

  // Convert beaconsByTopic to array format for easier processing
  const allBeacons = useMemo(() => {
    const result: any[] = [];

    // Iterate through each topic
    Object.values(beaconsByTopicObj).forEach((topicBeacons) => {
      if (!topicBeacons) return;

      // topicBeacons is an object with beaconId as keys
      const beaconArray = Object.values(topicBeacons);
      result.push(...beaconArray);
    });

    return result;
  }, [beaconsByTopicObj]);

  const alarmTriggers = useSelector((s: RootState) => s.alarmTriggerReducer.alarmTriggers || []);

  const handleItemClick = (item: CombinedLogItem) => {
    // console.log('🟡 handleItemClick called', list);
    setSelectedItem(item);
    setOpenModal(true);
  };

  const handleOpenDetails = (cardNumber: string, area: string, floorplan: string, time: string) => {
    // console.log('🟡 handleOpenDetails called', cardNumber);
    dispatch(SetSelectedBeacon({ active: true, id: cardNumber, area, floorplan, time, sourceScreenId: 1 }));
    setOpenModal(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  };

  return (
    <>
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
        >Clear All</Button>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 200px)', md: '100vh' }, maxHeight: '800px' }}>
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

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        {selectedItem && (
          <>
            <DialogTitle
              sx={{ fontSize: '1rem', p: '16px' }}
              bgcolor={selectedItem.type === 'Alarm' ? 'error.main' : 'secondary.main'}
              color="white"
            >
              {selectedItem.type} Event
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: '8px 16px', ml: '8px' }}>
              <Box>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  Target: {selectedItem.target}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Time: {formatTime(selectedItem.time)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Floor: {selectedItem.floor}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Area: {selectedItem.area}
                </Typography>
                {isAlarmLog(selectedItem) && (
                  <>
                    <Typography variant="body1" gutterBottom>
                      Alarm Type: {selectedItem.alarmStatus || '-'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      Status: {selectedItem.action || '-'}
                    </Typography>
                  </>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: '8px 16px' }}>
              <Button
                onClick={() =>
                  handleOpenDetails(
                    selectedItem.dmac,
                    selectedItem.area,
                    selectedItem.floor,
                    selectedItem.time,
                  )
                }
                size="small"
                variant="contained"
              >
                Person Details
              </Button>
              <Button
                color="error"
                onClick={() => setOpenModal(false)}
                size="small"
                variant="outlined"
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default SidebarList;
