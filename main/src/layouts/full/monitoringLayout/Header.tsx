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
import { setActiveLayout, setScreenDisplay } from 'src/store/apps/monitoring/layout';
import { publishMQTT } from 'src/store/apps/tracking/MQTT';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { useAllVisitor } from 'src/hooks/useVisitor';

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
  // const [visitorList, setVisitorList] = useState<VisitorType[]>([]);
  const { data: visitorList = [], isLoading: loading } = useAllVisitor();
  const filteredVisitorList = visitorList.filter(
    (v: VisitorType) => v.bleCardNumber && v.bleCardNumber.trim() !== '',
  );
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
  const handleFollowVisitor = (visitor: VisitorType) => {
    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) {
      console.warn('No screens available in active layout.');
      return;
    }

    const bleNumber = visitor.bleCardNumber;
    const topic = `highlight/card/${bleNumber}`;
    const payload = 'Start';

    // ✅ Publish Start message
    publishMQTT(topic, payload);
    console.log(
      `Following visitor ${visitor.name} (${bleNumber}) on layout ${activeLayoutId}, screen ${firstScreen.id}`,
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

    setSelectedVisitor(null); // clear search
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
              <Autocomplete
                value={selectedVisitor}
                onChange={(e, newValue) => {
                  if (newValue) handleFollowVisitor(newValue);
                }}
                options={filteredVisitorList}
                loading={loading}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={filter}
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Visitor"
                    variant="outlined"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id || uniqueId()}>
                    <Box>
                      <Typography fontWeight={700}>{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.bleCardNumber}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
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
