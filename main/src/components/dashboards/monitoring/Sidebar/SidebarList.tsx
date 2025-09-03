// src/views/monitoring/SidebarList.tsx
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

import { fetchAlarm } from 'src/store/apps/tracking/Alarm';          // NTFY-backed
import { fetchBeacon } from 'src/store/apps/tracking/Beacon';        // MQTT-backed
import { fetchMemberDT, memberType } from 'src/store/apps/crud/member';
import { fetchVisitorDT, VisitorType } from 'src/store/apps/crud/visitor';
import { SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';

interface SidebarListProps {
  filterType: string; // '', 'All', 'Tracking', 'Alarm'
}

type ListType = {
  id: string;                       // stable unique id for React key
  device: string;                   // label (Alarm / Tracking Event)
  target: string;                   // person name or beacon id
  floor: string;
  area: string;
  alarmType?: string;               // Alarm only
  time: string;                     // ISO
  status?: string;                  // Alarm only (Active/Inactive)
  type: 'Alarm' | 'Tracking';
};

const dataTableFilter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: '',
  sortDir: 'asc',
  SearchValue: '',
};

const SidebarList = ({ filterType }: SidebarListProps) => {
  const dispatch = useDispatch();

  // ── modal state
  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ListType | null>(null);

  // ── list state (append-only from initialization)
  const [list, setList] = useState<ListType[]>([]);

  // ── master data for resolving names
  const memberList: memberType[] = useSelector((s: RootState) => s.memberReducer.members);
  const visitorList: VisitorType[] = useSelector((s: RootState) => s.visitorReducer.visitors);

  // ── live data: MQTT beacons by topic (Beacon slice)
  const beaconsByTopic = useSelector((s: RootState) => s.BeaconReducer.beaconsByTopic || {});
  // ── live data: NTFY alarms (Alarm slice)
  const alarmList = useSelector((s: RootState) => s.AlarmActiveReducer.alarms || []);

  // ── layout selection (which floorplans should we listen to)
  const selectedGrid = useSelector((s: RootState) => s.layoutReducer.grid);
  const selectedFloorplan = useSelector((s: RootState) => s.layoutReducer.floorplanId);

  const floorplanIds: string[] = useMemo(() => {
    const ids = selectedFloorplan?.[selectedGrid] ?? [];
    return Array.isArray(ids) ? ids : [];
  }, [selectedFloorplan, selectedGrid]);

  // ── resolve display name from beacon/card id
  const getName = (bleNumber: string) => {
    const m = memberList.find((x) => x.bleCardNumber === bleNumber);
    if (m) return m.name;
    const v = visitorList.find((x) => x.bleCardNumber === bleNumber);
    if (v) return v.name;
    return bleNumber || 'Unknown';
  };

  // ── remember previous area per beacon to detect ENTER events only
  const prevAreaByBeaconRef = useRef<Record<string, string>>({});

  // ── remember which row IDs we've already appended (de-dup / stable keys)
  const seenIdsRef = useRef<Set<string>>(new Set());

  // ── keep unsubscribers for MQTT/NTFY to clean on changes/unmount
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // ── build stable keys (avoid duplicate React keys)
  const alarmKey = (a: any) => {
    const t = a.time ? new Date(a.time).getTime() : 0;
    if (a.id) return `alarm-${a.id}`;
    return `alarm-${a.beaconId || 'unk'}-${a.maskedAreaName || a.maskedAreaId || 'na'}-${t}`;
  };
  const trackingKey = (b: any) => {
    const t = b.time ? new Date(b.time).getTime() : 0;
    const beaconId = b.beaconId || b.cardId || b.id || 'unk';
    const area = b.maskedAreaName || b.areaName || b.maskedAreaId || 'na';
    return `trk-${beaconId}-${area}-${t}`;
  };

  // ── bootstrap: fetch master lists + subscribe to MQTT (beacons) & NTFY (alarms)
  useEffect(() => {
    // master data (names)
    dispatch(fetchVisitorDT(dataTableFilter));
    dispatch(fetchMemberDT(dataTableFilter));

    // clear old subscriptions
    unsubscribersRef.current.forEach((u) => u());
    unsubscribersRef.current = [];

    // MQTT: subscribe beacons per floorplan
    for (const floorplanId of floorplanIds) {
      const topic = `tracking/${floorplanId}`;
      const u = dispatch(fetchBeacon(topic)); // thunk returns unsubscribe
      if (typeof u === 'function') unsubscribersRef.current.push(u);
    }

    // NTFY: subscribe alarms (single topic; adapt if you want per-floorplan)
    const ua = dispatch(fetchAlarm('192.168.1.116:6099/tracking-ntfy'));
    if (typeof ua === 'function') unsubscribersRef.current.push(ua);

    return () => {
      unsubscribersRef.current.forEach((u) => u());
      unsubscribersRef.current = [];
    };
  }, [dispatch, floorplanIds]);

  // ── on any new data, append new rows (area-entry for Tracking, all Alarms), then filter/sort
  useEffect(() => {
    const rowsToAppend: ListType[] = [];

    // A) append alarms from NTFY (Alarm slice)
    for (const a of alarmList) {
      const id = alarmKey(a);
      if (!seenIdsRef.current.has(id)) {
        rowsToAppend.push({
          id,
          device: 'Alarm',
          target: getName(a.beaconId),
          floor: a.floorplanName || 'Unknown Floor',
          area: a.maskedAreaName || 'Unknown Area',
          alarmType: a.inRestrictedArea ? 'Restricted' : undefined,
          status: a.is_Active ? 'Active' : 'Inactive',
          time: a.time || new Date().toISOString(),
          type: 'Alarm',
        });
        console.log('[Sidebar] Append Alarm:', id);
      } else {
        // console.log('[Sidebar] Skip duplicate Alarm:', id);
      }
    }

    // B) append tracking events only when a beacon ENTERS a new area (MQTT beacons)
    Object.entries(beaconsByTopic).forEach(([, beacons]) => {
      (beacons || []).forEach((b: any) => {
        const beaconId = b.beaconId || b.cardId || b.id || '';
        if (!beaconId) return;

        const areaNow = b.maskedAreaName || b.areaName || '';
        if (!areaNow) return; // can't detect area changes

        const prevArea = prevAreaByBeaconRef.current[beaconId];
        if (prevArea !== areaNow) {
          // area change: record and append
          prevAreaByBeaconRef.current[beaconId] = areaNow;

          const id = trackingKey(b);
          if (!seenIdsRef.current.has(id)) {
            rowsToAppend.push({
              id,
              device: 'Tracking Event',
              target: getName(beaconId),
              floor: b.floorplanName || 'Unknown Floor',
              area: areaNow,
              time: b.time || new Date().toISOString(),
              type: 'Tracking',
            });
            console.log('[Sidebar] Append Tracking (area-enter):', id);
          } else {
            // console.log('[Sidebar] Skip duplicate Tracking:', id);
          }
        } else {
          // stayed in same area → ignore
          // console.log('[Sidebar] Ignore (same area):', beaconId, areaNow);
        }
      });
    });

    if (rowsToAppend.length === 0) return;

    // Merge safely and apply filter/sort
    setList((prev) => {
      const merged = [...prev];
      for (const row of rowsToAppend) {
        if (!seenIdsRef.current.has(row.id)) {
          seenIdsRef.current.add(row.id);
          merged.push(row);
        }
      }

      let filtered = merged;
      if (filterType && filterType !== 'All') {
        filtered = filtered.filter((x) => x.type === filterType);
      }

      // ascending by time; switch operands for newest-on-top
      filtered.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      return filtered;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmList, beaconsByTopic, filterType]);

  // ── dialog actions
  const handleItemClick = (item: ListType) => {
    setSelectedItem(item);
    setOpenModal(true);
  };

  const handleOpenDetails = (cardNumber: string, area: string, floorplan: string, time: string) => {
    dispatch(SetSelectedBeacon({ active: true, id: cardNumber, area, floorplan, time }));
    setOpenModal(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  };

  return (
    <>
      <List>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 270px)', md: '100vh' }, maxHeight: '800px' }}>
          {list.map((item) => (
            <SidebarListItem key={item.id} item={item} onItemClick={() => handleItemClick(item)} />
          ))}
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
              {selectedItem.device}
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
                {selectedItem.type === 'Alarm' && (
                  <>
                    <Typography variant="body1" gutterBottom>
                      Alarm Type: {selectedItem.alarmType || '-'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      Status: {selectedItem.status || '-'}
                    </Typography>
                  </>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: '8px 16px' }}>
              <Button
                onClick={() =>
                  handleOpenDetails(
                    selectedItem.target,
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
              <Button color="error" onClick={() => setOpenModal(false)} size="small" variant="outlined">
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
