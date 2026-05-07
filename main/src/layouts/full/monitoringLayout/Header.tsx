import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Divider,
  Autocomplete,
  TextField,
  CircularProgress,
  Typography,
  createFilterOptions,
  Select,
  MenuItem,
  Tooltip,
  Button,
} from '@mui/material';

import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar, hoverSidebar, setMonitorSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconRestore, IconBellRinging } from '@tabler/icons-react';
import Profile from '../vertical/header/Profile';
import { RootState } from 'src/store/Store';
import Logo from '../shared/logo/Logo';
import NavListing from './Navigation/NavListing';
import { useEffect, useState } from 'react';
import Notification from '../vertical/header/Notification';
import { restartEngine } from 'src/store/apps/crud/engine';
import TimeDisplay from '../horizontal/navbar/TimeDisplay';
import { uniqueId } from 'lodash';
import {
  PersonOption,
  setActiveLayout,
  setFollowingPerson,
  setScreenDisplay,
} from 'src/store/apps/monitoring/layout';
import { publishMQTT } from 'src/store/apps/tracking/MQTT';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { memberType } from 'src/store/apps/crud/member';
import toast from 'react-hot-toast';
import { useLatestPosition } from 'src/hooks/useDashboard';
import { useLocation } from 'react-router';
import {
  AppendAlarmLogs,
  NotifyAlarmPopup,
  ShowAlarmPopup,
  AlarmLogItem,
} from 'src/store/apps/tracking/Beacon';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { pathname } = useLocation();
  const pathDirect = pathname;
  // drawer
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();
  const isSidebarHover = useSelector((state: RootState) => state.customizer.isSidebarHover);
  const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const activeLayout = layouts.find((l: any) => l.id === activeLayoutId) ?? null;
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  // const [visitorList, setVisitorList] = useState<VisitorType[]>([]);
  const { data: visitorList = [], isLoading: loading } = useAllVisitor();
  const { data: memberList = [], isLoading: memberLoading } = useAllMembers();
  const { data: securityList = [], isLoading: securityLoading } = useAllSecuritys();
  const { data: personList = [], isLoading: personLoading } = useLatestPosition('daily');
  console.log('personList', personList);
  const filteredVisitorList = visitorList.filter(
    (v: VisitorType) => v.bleCardNumber && v.bleCardNumber.trim() !== '',
  );
  const filteredMemberList = memberList.filter(
    (m: memberType) => m.bleCardNumber && m.bleCardNumber.trim() !== '',
  );
  const filteredSecurityList = securityList.filter(
    (s: memberType) => s.bleCardNumber && s.bleCardNumber.trim() !== '',
  );

  const allPeople: PersonOption[] = [
    ...filteredVisitorList.map((v) => ({
      id: v.id,
      name: v.name,
      bleCardNumber: v.bleCardNumber,
      type: 'visitor' as const,
    })),
    ...filteredMemberList.map((m) => ({
      id: m.id,
      name: m.name,
      bleCardNumber: m.bleCardNumber,
      type: 'member' as const,
    })),
    ...filteredSecurityList.map((s) => ({
      id: s.id,
      name: s.name,
      bleCardNumber: s.bleCardNumber,
      type: 'security' as const,
    })),
  ];
  // const [loading, setLoading] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType | null>(null);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: settings.TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement); // Update state based on fullscreenElement
    };
    console.log('isFullscreen', isFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('msfullscreenchange', handleFullscreenChange); // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 🟢 When a visitor is chosen → Follow them
  const handleFollowPerson = (person: PersonOption) => {
    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) {
      console.warn('No screens available in active layout.');
      toast.error('No screens available in active layout.');
      return;
    }
    const personId = person.id;
    const bleNumber = person.bleCardNumber;
    const topic = `highlight/card/${bleNumber}`;
    const payload = 'Start';

    // ✅ Publish Start message
    publishMQTT(topic, payload);
    console.log(
      `Following person ${person.name} (${bleNumber}) on layout ${activeLayoutId}, screen ${firstScreen.id}`,
    );

    // ✅ Switch first screen into Follow Mode
    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 3, // Follow Mode
          displayOutput: bleNumber,
        },
      }),
    );
    dispatch(setFollowingPerson(person));
    setSelectedVisitor(null); // clear search
  };

  const handleCancelFollowing = () => {
    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) {
      console.warn('No screen found.');
      return;
    }

    if (followingPerson?.bleCardNumber) {
      const topic = `highlight/card/${followingPerson.bleCardNumber}`;
      publishMQTT(topic, 'Stop');
    }

    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id, // ✅ sesuai request
        display: {
          displayType: 0,
          displayOutput: '',
        },
      }),
    );

    dispatch(setFollowingPerson(null));

    console.log('🛑 Stop following');
  };

  const filter = createFilterOptions<VisitorType>({
    stringify: (option) => `${option.name} ${option.bleCardNumber}`,
  });

  const handleDummyAlarm = () => {
    const dummyAlarm: AlarmLogItem = {
      id: `alarm-dummy-${Date.now()}`,
      type: 'Alarm',
      target: 'Test Dummy Alarm',
      image: '',
      color: '#f44336',
      dmac: 'DE:AD:BE:EF:00:01',
      floor: 'Testing Room 1',
      floorplanId: 'dummy-floor-id',
      area: 'Restricted Zone A',
      personId: 'dummy-p-1',
      triggerId: 'dummy-t-1',
      alarmStatus: 'Test Alarm',
      action: 'Idle',
      priority: 'high',
      time: new Date().toISOString(),
      seen: false,
      personType: 'Visitor',
    };

    dispatch(AppendAlarmLogs([dummyAlarm]));
    dispatch(ShowAlarmPopup(dummyAlarm));
    dispatch(NotifyAlarmPopup(dummyAlarm.id));
  };

  const handleClick = async () => {
    try {
      await dispatch(restartEngine('admin'));
      // handle success
    } catch (error) {
      // handle error
    }
  };

  return (
    !isFullscreen && (
      <AppBarStyled position="sticky" color="default">
        <ToolbarStyled>
          {/* ------------------------------------------- */}
          {/* Toggle Button Sidebar */}
          {/* ------------------------------------------- */}
          <IconButton
            color="inherit"
            aria-label="menu"
            onMouseEnter={() => dispatch(hoverSidebar(true))}
            onMouseLeave={() => dispatch(hoverSidebar(false))}
            onClick={
              lgUp
                ? () => dispatch(hoverSidebar(!isSidebarHover))
                : () => dispatch(toggleMobileSidebar())
            }
          >
            <IconMenu2 size="20" />
          </IconButton>
          <Box px={3}>
            <Logo />
          </Box>
          <NavListing pathDirect={pathDirect} />

          {/* ------------------------------------------- */}
          {/* Search Dropdown */}
          {/* ------------------------------------------- */}
          {/* <Search /> */}
          {/* {lgUp ? (
        <>\\
          <Navigation />
        </>
      ) : null} */}

          <Box flexGrow={1} />
          {!pathDirect.includes('/config') && (
            <Stack spacing={1} direction="row" alignItems="center">
              <Typography variant="h5" fontWeight={900}>
                Layout :
              </Typography>

              <Select
                value={activeLayoutId ?? ''}
                onChange={(e) => dispatch(setActiveLayout(e.target.value))}
                variant="outlined"
                size="small"
                sx={{ minWidth: '220px', fontWeight: 'bold' }}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  -- Select Layout --
                </MenuItem>
                {layouts.map((layout: any) => (
                  <MenuItem key={layout.id} value={layout.id}>
                    {layout.name || 'Unnamed Layout'}
                  </MenuItem>
                ))}
              </Select>
              {/* 🔍 Visitor Search Autocomplete */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {followingPerson ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      bgcolor: 'grey.100',
                    }}
                  >
                    <Typography fontWeight={700}>Following : {followingPerson.name}</Typography>

                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ({followingPerson.type})
                    </Typography>

                    <IconButton size="small" onClick={handleCancelFollowing}>
                      ✕
                    </IconButton>
                  </Box>
                ) : (
                  // Autocomplete here
                  <Autocomplete
                    value={null}
                    onChange={(e, newValue) => {
                      if (newValue) handleFollowPerson(newValue);
                    }}
                    options={allPeople}
                    loading={loading || memberLoading || securityLoading}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    sx={{ width: 300 }}
                    renderInput={(params) => (
                      <TextField {...params} label="Search People" size="small" />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <Box>
                          <Typography fontWeight={700}>{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.bleCardNumber} • {option.type}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                )}
              </Box>
              <Tooltip title="Send Test Alarm">
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDummyAlarm}
                  sx={{
                    minWidth: 0,
                    width: 48,
                    height: 48,
                    padding: 0,
                  }}
                >
                  <IconBellRinging size="21" stroke="1.5" />
                </Button>
              </Tooltip>
              {/* Right side clock */}
              <Tooltip title="Restart Engine">
                <IconButton size="large" color="inherit">
                  <IconRestore size="21" stroke="1.5" onClick={handleClick} />
                </IconButton>
              </Tooltip>

              {/* <Profile /> */}
            </Stack>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <TimeDisplay />
          </Box>
        </ToolbarStyled>
        <Divider />
      </AppBarStyled>
    )
  );
};

export default Header;
