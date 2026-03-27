import { useState } from 'react';
import { useSelector, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { Box, Typography, IconButton, Divider } from '@mui/material';

import {
  IconChevronRight,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconMap,
  IconRoute,
  IconRadar,
  IconClock,
  IconUsers,
  IconSquare,
  IconDeviceIpad,
} from '@tabler/icons-react';

import { useMaskedAreaList } from 'src/hooks/useMaskedArea';
import { usePatrolAreaList } from 'src/hooks/usePatrolArea';
import { useFloorplanDeviceList } from 'src/hooks/useFloorplanDevice';
import { useGeoFencingAlarms } from 'src/hooks/AlarmSetting/useGeofence';
import { useStayOnAreaAlarms } from 'src/hooks/AlarmSetting/useStayOnArea';
import { useOverPopulatingAlarms } from 'src/hooks/AlarmSetting/useOverPopulate';
import { useBoundaryAlarms } from 'src/hooks/AlarmSetting/useBoundary';

import FloorplanOverviewSidebarItem from './FloorplanOverviewSidebarItem';

type SectionKey = 'areas' | 'patrol' | 'devices' | 'geofence' | 'stay' | 'over' | 'boundary';

type VisibilityState = {
  accordionHidden: boolean;
  items: Record<string, boolean>;
};

const FloorplanOverviewSidebar = () => {
  const activeFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );

  // ================= DATA =================
  const { data: areas } = useMaskedAreaList({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: { FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [], FloorId: [] },
  });
  const { data: patrol } = usePatrolAreaList({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: { FloorplanId: activeFloorplan?.id || '', FloorId: '' },
  });
  const { data: devices } = useFloorplanDeviceList({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorplanMaskedAreaId: [],
    },
  });
  const { data: geofence } = useGeoFencingAlarms({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorplanMaskedAreaId: [],
    },
  });
  const { data: stay } = useStayOnAreaAlarms({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorplanMaskedAreaId: [],
    },
  });
  const { data: over } = useOverPopulatingAlarms({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorplanMaskedAreaId: [],
    },
  });
  const { data: boundary } = useBoundaryAlarms({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorplanMaskedAreaId: [],
    },
  });

  // ================= STATE =================
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    areas: true,
    patrol: true,
    devices: false,
    geofence: false,
    stay: false,
    over: false,
    boundary: false,
  });

  const [visibility, setVisibility] = useState<Record<SectionKey, VisibilityState>>({
    areas: { accordionHidden: false, items: {} },
    patrol: { accordionHidden: false, items: {} },
    devices: { accordionHidden: false, items: {} },
    geofence: { accordionHidden: false, items: {} },
    stay: { accordionHidden: false, items: {} },
    over: { accordionHidden: false, items: {} },
    boundary: { accordionHidden: false, items: {} },
  });

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // ================= LOGIC =================
  const isVisible = (section: SectionKey, id: string) => {
    const s = visibility[section];
    if (s.items[id] !== undefined) return s.items[id];
    return !s.accordionHidden;
  };

  const toggleSectionHide = (section: SectionKey) => {
    setVisibility((prev) => {
      const nextHidden = !prev[section].accordionHidden;

      return {
        ...prev,
        [section]: {
          accordionHidden: nextHidden,
          items: {}, // 🔥 RESET ALL OVERRIDES
        },
      };
    });
  };

  const toggleItem = (section: SectionKey, id: string, list: any[]) => {
    setVisibility((prev) => {
      const sectionState = prev[section];

      // toggle current item
      const newItems = {
        ...sectionState.items,
        [id]: !isVisible(section, id),
      };

      // 🔥 check if ALL items are visible
      const allVisible = list.every((item) => {
        if (newItems[item.id] !== undefined) return newItems[item.id];
        return !sectionState.accordionHidden;
      });
      const allHidden = list.every((item) => {
        if (newItems[item.id] !== undefined) return !newItems[item.id];
        return sectionState.accordionHidden;
      });

      return {
        ...prev,
        [section]: {
          accordionHidden: allVisible ? false : allHidden ? true : sectionState.accordionHidden,
          items: newItems,
        },
      };
    });
  };

  const toggleExpand = (section: SectionKey) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ================= UI =================
  const renderSection = (
    section: SectionKey,
    title: string,
    icon: React.ReactNode,
    list: any[],
  ) => {
    const isExpanded = expanded[section];
    const hidden = visibility[section].accordionHidden;

    return (
      <Box
        sx={{
          mb: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
        }}
      >
        {/* HEADER */}
        <Box
          onClick={() => toggleExpand(section)}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            cursor: 'pointer',
            backgroundColor: 'background.paper',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
            {icon}
            <Typography fontWeight={600}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">
              ({list?.length || 0})
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionHide(section);
            }}
          >
            {hidden ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </IconButton>
        </Box>

        {/* CONTENT */}
        {isExpanded && (
          <Box sx={{ maxHeight: 260, overflowY: 'auto', px: 1, pb: 1 }}>
            <Scrollbar sx={{}}>
              {list?.map((item: any) => {
                const visible = isVisible(section, item.id);

                return (
                  <FloorplanOverviewSidebarItem
                    key={item.id}
                    title={item.name || item.label}
                    selected={selectedItem === item.id}
                    onClick={() => setSelectedItem(item.id)}
                    show={visible}
                    onHideClick={() => toggleItem(section, item.id, list)}
                  />
                );
              })}
            </Scrollbar>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '260px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <Box px={2} py={2}>
        <Typography variant="h5" fontWeight={700}>
          {activeFloorplan?.name}
        </Typography>
      </Box>
      <Divider />
      {/* BODY */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, mt: 1 }}>
        {renderSection('areas', 'Area(s)', <IconMap size={16} />, areas?.data || [])}
        {renderSection('devices', 'BLE Readers', <IconDeviceIpad size={16} />, devices?.data || [])}
        {renderSection('patrol', 'Patrol Area(s)', <IconRoute size={16} />, patrol?.data || [])}

        {renderSection(
          'geofence',
          'Geofence Alarm(s)',
          <IconRadar size={16} />,
          geofence?.data || [],
        )}
        {renderSection('stay', 'Stay On Area', <IconClock size={16} />, stay?.data || [])}
        {renderSection('over', 'Overpopulate', <IconUsers size={16} />, over?.data || [])}
        {renderSection('boundary', 'Boundary', <IconSquare size={16} />, boundary?.data || [])}
      </Box>
    </Box>
  );
};

export default FloorplanOverviewSidebar;
