import { useState } from 'react';
import { useSelector, RootState, useDispatch } from 'src/store/Store';
import { SelectFloorplan } from 'src/store/apps/crud/floorplan';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';

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
  IconExternalLink,
} from '@tabler/icons-react';

import { useMaskedAreaList } from 'src/hooks/useMaskedArea';
import { usePatrolAreaList } from 'src/hooks/usePatrolArea';
import { useFloorplanDeviceList } from 'src/hooks/useFloorplanDevice';
import { useGeoFencingAlarms } from 'src/hooks/AlarmSetting/useGeofence';
import { useStayOnAreaAlarms } from 'src/hooks/AlarmSetting/useStayOnArea';
import { useOverPopulatingAlarms } from 'src/hooks/AlarmSetting/useOverPopulate';
import { useBoundaryAlarms } from 'src/hooks/AlarmSetting/useBoundary';

import FloorplanOverviewSidebarItem from './FloorplanOverviewSidebarItem';
import { SectionKey, VisibilityState } from 'src/views/master/crud/FloorplanOverviewTypes';
import { PictureAsPdf, TableChart } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAllAlarmCategory } from 'src/hooks/AlarmSetting/useAlarmCategory';

type Props = {
  visibility: Record<SectionKey, VisibilityState>;
  toggleSectionHide: (section: SectionKey) => void;
  toggleItem: (section: SectionKey, id: string, list: any[]) => void;
  isVisible: (section: SectionKey, id: string) => boolean;
  onExport: (type: 'pdf' | 'png') => void;
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
};

const FloorplanOverviewSidebar = ({
  visibility,
  toggleSectionHide,
  toggleItem,
  isVisible,
  onExport,
  selectedItem,
  setSelectedItem,
}: Props) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSectionRedirect = (section: SectionKey) => {
    if (!activeFloorplan) return;

    if (['areas', 'devices', 'patrol'].includes(section)) {
      dispatch(SelectFloorplan(activeFloorplan));
    }

    switch (section) {
      case 'areas':
        navigate('/master/floorplanmaskedarea/edit');
        break;
      case 'devices':
        navigate('/master/device/edit');
        break;
      case 'patrol':
        navigate('/master/patrolarea/edit');
        break;
      case 'geofence':
        navigate('/alarmsetting/geofencing');
        break;
      case 'stay':
        navigate('/alarmsetting/stayonarea');
        break;
      case 'over':
        navigate('/alarmsetting/peoplecounting');
        break;
      case 'boundary':
        navigate('/alarmsetting/boundary');
        break;
      default:
        break;
    }
  };
const alarmCategory = useAllAlarmCategory().data || [];
const normalize = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '');

const isActive = (name: string) =>
  alarmCategory.some(a => normalize(a?.alarmCategory) === name && a?.isEnabled);

const isGeoFencingActive = isActive('geofence');
const isOverPopulatingActive = isActive('overpopulating');
const isStayOnAreaActive = isActive('stayonarea');
const isBoundaryActive = isActive('boundary');

  const activeFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const activeFeatures = useSelector(
    (state: RootState) => state.sessionReducer.activeFeatures,
  );

  const hasFeature = (keys: string[]) =>
    Array.isArray(activeFeatures) && keys.some((k) => activeFeatures.includes(k));

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget );
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

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
    patrol: false,
    devices: false,
    geofence: false,
    stay: false,
    over: false,
    boundary: false,
  });


  // ================= LOGIC =================
  const toggleExpand = (section: SectionKey) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleExport = (type: 'pdf' | 'png') => {
    onExport(type);
    handleClose();
  };

  const handleBack = () => {
    setSelectedItem(null);
    setIsExporting(false);
    navigate('/master/floorplan');
  }
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

          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title={`Go to ${title} edit page`} arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSectionRedirect(section);
                }}
                sx={{ color: 'primary.main' }}
              >
                <IconExternalLink size={18} />
              </IconButton>
            </Tooltip>

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
        </Box>

        {/* CONTENT */}
        {isExpanded && (
          <Box sx={{ maxHeight: 260, overflowY: 'auto', px: 1, pb: 1 }}>
            <Scrollbar sx={{}}>
              {list?.map((item: any) => {
                const visible = isVisible(section, item.id);
                console.log("Item", item);
                return (
                  <FloorplanOverviewSidebarItem
                    key={item.id}
                    title={item.name || item.label}
                    color={item.color || item.colorArea}
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
    <Box sx={{ width: '320px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <Box px={2} py={2}>
        <Typography variant="h5" fontWeight={700}>
          {activeFloorplan?.name}
        </Typography>
      </Box>
      <Divider />
      {/* BODY */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, mt: 1, minHeight: 0 }}>
        {renderSection('areas', 'Area(s)', <IconMap size={16} />, areas?.data || [])}
        {renderSection('devices', 'BLE Readers', <IconDeviceIpad size={16} />, devices?.data || [])}
        {hasFeature(['module.patrol']) && renderSection('patrol', 'Patrol Area(s)', <IconRoute size={16} />, patrol?.data || [])}

        {isGeoFencingActive && hasFeature(['module.alarm.geofence']) && renderSection(
          'geofence',
          'Geofence Alarm(s)',
          <IconRadar size={16} />,
          geofence?.data || [],
        )}
        {isStayOnAreaActive && hasFeature(['module.alarm.stayOnArea']) && renderSection('stay', 'Stay On Area', <IconClock size={16} />, stay?.data || [])}
        {isOverPopulatingActive && hasFeature(['module.alarm.overpopulating']) && renderSection('over', 'Overpopulate', <IconUsers size={16} />, over?.data || [])}
        {isBoundaryActive && hasFeature(['module.alarm.boundary']) && renderSection('boundary', 'Boundary', <IconSquare size={16} />, boundary?.data || [])}
      </Box>
      <Box flexGrow="0" />
      {/* FOOTER */}
      <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
        <Button variant="outlined" onClick={handleBack}>
          Back
        </Button>
        <Button variant="contained" onClick={handleClick} disabled={isExporting}>
          {isExporting ? <CircularProgress size={20} color="inherit" /> : 'Export'}
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={() => handleExport('pdf')}>
            <ListItemIcon>
              <PictureAsPdf fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>as PDF</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExport('png')}>
            <ListItemIcon>
              <TableChart fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>as PNG</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default FloorplanOverviewSidebar;
