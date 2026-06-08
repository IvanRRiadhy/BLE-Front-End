import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useMemo, useState } from 'react';
import { AlarmLogItem, MarkAlarmSeen, TrackingLogItem } from 'src/store/apps/tracking/Beacon';
import { useAllSecuritys } from './useSecurityGuard';

export type CombinedLogItem = TrackingLogItem | AlarmLogItem;

export function useTrackingLogs(): TrackingLogItem[] {
  const beaconsByTopic = useSelector((state: RootState) => state.BeaconReducer.beaconsByTopic);
  const alarmTriggers = useSelector((state: RootState) => state.alarmTriggerReducer.alarmTriggers);

  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();

  return useMemo(() => {
    const logs: TrackingLogItem[] = [];

    const getName = (ble: string) =>
      members.find((m) => m.bleCardNumber === ble)?.name ||
      visitors.find((v) => v.bleCardNumber === ble)?.name ||
      'Unknown';

    const getImage = (ble: string) =>
      members.find((m) => m.bleCardNumber === ble)?.faceImage ||
      visitors.find((v) => v.bleCardNumber === ble)?.faceImage ||
      '';

    // 🔔 ALARMS
    alarmTriggers.forEach((a) => {
      logs.push({
        id: `alarm-${a.id}`,
        device: 'Alarm',
        type: 'Alarm',
        target: getName(a.beaconId),
        image: getImage(a.beaconId),
        personId: a.beaconId,
        dmac: a.beaconId,
        floor: a.floorplan?.name || 'Unknown Floor',
        area: 'Unknown Area',
        time: a.triggerTime,
        status: a.isActive ? 'Active' : 'Inactive',
        alarmType: a.isInRestrictedArea ? 'Restricted' : undefined,
      });
    });

    // 📍 TRACKING
    Object.values(beaconsByTopic).forEach((topic) => {
      Object.values(topic).forEach((b: any) => {
        logs.push({
          id: `trk-${b.beaconId}-${b.time}`,
          device: b.firstReaderId,
          type: 'Tracking',
          target: getName(b.beaconId),
          image: getImage(b.beaconId),
          personId: b.beaconId,
          dmac: b.beaconId,
          floor: b.floorplanName || 'Unknown Floor',
          area: b.maskedAreaName || 'Unknown Area',
          time: b.time,
        });
      });
    });

    return logs;
  }, [beaconsByTopic, alarmTriggers, members, visitors]);
}

export function useEnrichedTrackingLogs(): TrackingLogItem[] {
  const logs = useSelector((state: RootState) => state.BeaconReducer.trackingLogs);

  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();
  const { data: security = []} = useAllSecuritys();
// console.log("Tracking Log: ", logs);
  return useMemo(() => {
    const memberMap = new Map(members.map((m) => [m.bleCardNumber, m]));
    const visitorMap = new Map(visitors.map((v) => [v.bleCardNumber, v]));
    const securityMap = new Map(security.map((s) => [s.bleCardNumber, s]));

    return logs.map((log) => {
      const m = memberMap.get(log.dmac);
      const v = visitorMap.get(log.dmac);
      const s = securityMap.get(log.dmac);
      
      return {
        ...log,
        target: m?.name || v?.name || s?.name || 'Unknown',
        personId: m?.personId || v?.personId || s?.personId || '',
        image: m?.faceImage || v?.faceImage || s?.faceImage || '',
      };
    });
  }, [logs, members, visitors]);
}

export function useEnrichedAlarmLogs(): AlarmLogItem[] {
  const alarmLogs = useSelector((state: RootState) => state.BeaconReducer.alarmLogs);

  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();
  const { data: security = []} = useAllSecuritys();

  return useMemo(() => {
    const memberMap = new Map(members.map((m) => [m.bleCardNumber, m]));
    const visitorMap = new Map(visitors.map((v) => [v.bleCardNumber, v]));
    const securityMap = new Map(security.map((s) => [s.bleCardNumber, s]));

    return alarmLogs.map((log: AlarmLogItem) => {
      const m = memberMap.get(log.dmac);
      const v = visitorMap.get(log.dmac);
      const s = securityMap.get(log.dmac);
      // console.log("AlarmLog :", log);
      return {
        ...log,
        target: m?.name || v?.name || s?.name || log.target || 'Unknown',
        image: m?.faceImage || v?.faceImage || s?.faceImage || log.image || '',
        personId: m?.personId || v?.personId || s?.personId || log.personId || '',
        personType: m ? 'Member' : v ? 'Visitor' : s ? 'Security' : undefined,
      };
    });
  }, [alarmLogs, members, visitors]);
}

export function useCombinedEnrichedLogs(limit?: number): CombinedLogItem[] {
  const trackingLogs = useEnrichedTrackingLogs();
  const alarmLogs = useEnrichedAlarmLogs();
  // console.log('Alarm Logs:', alarmLogs);
  // console.log('Tracking Logs:', trackingLogs);
  return useMemo(() => {
    const merged: CombinedLogItem[] = [...trackingLogs, ...alarmLogs];

    merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    // console.log('Combined Enriched Logs:', merged);
    return typeof limit === 'number' ? merged.slice(0, limit) : merged;
  }, [trackingLogs, alarmLogs, limit]);
}
export function useUnseenAlarms(currentAlarmId?: string) {
  const dispatch = useDispatch();
  const alarmLogs = useEnrichedAlarmLogs();
  const [softSeenIds, setSoftSeenIds] = useState<Set<string>>(new Set());

  const unseenAlarms = useMemo(
    () => alarmLogs.filter((a) => !a.seen && !softSeenIds.has(a.id) && a.id !== currentAlarmId),
    [alarmLogs, softSeenIds, currentAlarmId],
  );

  const markSeen = (alarm: AlarmLogItem) => {
    setSoftSeenIds((prev) => new Set(prev).add(alarm.id));
    dispatch(MarkAlarmSeen(alarm.id));
  };

  return {
    unseenAlarms,
    unseenCount: unseenAlarms.length,
    markSeen,
  };
}


