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
} from '@mui/material';

import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar, hoverSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconRestore } from '@tabler/icons-react';
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

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // drawer
  const customizer = useSelector((state: RootState) => state.customizer);
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
      minHeight: customizer.TopbarHeight,
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
          <NavListing />

          {/* ------------------------------------------- */}
          {/* Search Dropdown */}
          {/* ------------------------------------------- */}
          {/* <Search /> */}
          {/* {lgUp ? (
        <>
          <Navigation />
        </>
      ) : null} */}

          <Box flexGrow={1} />
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
              {layouts.map((layout) => (
                <MenuItem key={layout.id} value={layout.id}>
                  {layout.name || 'Unnamed Layout'}
                </MenuItem>
              ))}
            </Select>
            {/* 🔍 Visitor Search Autocomplete and Download Logs Button */}
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
            {/* Right side clock */}
            <Tooltip title="Restart Engine">
              <IconButton size="large" color="inherit">
                <IconRestore size="21" stroke="1.5" onClick={handleClick} />
              </IconButton>
            </Tooltip>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <TimeDisplay />
            </Box>

            {/* <Profile /> */}
          </Stack>
        </ToolbarStyled>
        <Divider />
      </AppBarStyled>
    )
  );
};

export default Header;
