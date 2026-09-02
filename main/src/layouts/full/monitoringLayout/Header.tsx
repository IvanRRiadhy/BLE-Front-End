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
  Select,
  MenuItem,
  Tooltip,
  Button,
  Checkbox,
  Paper,
  Typography,
  ClickAwayListener,
} from '@mui/material';

import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

import { useSelector, useDispatch } from 'src/store/Store';
import {
  toggleMobileSidebar,
  hoverSidebar,
} from 'src/store/customizer/CustomizerSlice';

import {
  IconMenu2,
  IconRestore,
  IconBellRinging,
} from '@tabler/icons-react';

import Profile from '../vertical/header/Profile';

import { RootState } from 'src/store/Store';
import Logo from '../shared/logo/Logo';
import NavListing from './Navigation/NavListing';

import { useEffect, useMemo, useState, useRef } from 'react';

import Notification from '../vertical/header/Notification';
import { restartEngine } from 'src/store/apps/crud/engine';
import TimeDisplay from '../horizontal/navbar/TimeDisplay';

import {
  setActiveLayout,
  setFollowingPerson,
  setFollowingPersons,
  setScreenDisplay,
} from 'src/store/apps/monitoring/layout';

import { PersonOption } from 'src/store/apps/monitoring/layout';

import { publishMQTT } from 'src/store/apps/tracking/MQTT';

import { useLatestPosition } from 'src/hooks/useDashboard';

import { useLocation } from 'react-router';

import {
  AppendAlarmLogs,
  NotifyAlarmPopup,
  ShowAlarmPopup,
  AlarmLogItem,
} from 'src/store/apps/tracking/Beacon';

import toast from 'react-hot-toast';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const appId = localStorage.getItem('applicationId') || '';
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const { pathname } = useLocation();
  const pathDirect = pathname;

  // ---------------------------------------------------------
  // Redux
  // ---------------------------------------------------------

  const customizer = useSelector(
    (state: RootState) => state.customizer,
  );

  const settings = useSelector(
    (state: RootState) => state.settings,
  );

  const dispatch = useDispatch();

  const isSidebarHover = useSelector(
    (state: RootState) => state.customizer.isSidebarHover,
  );

  const layouts = useSelector(
    (state: RootState) => state.layoutReducer.layouts ?? [],
  );

  const activeLayoutId = useSelector(
    (state: RootState) => state.layoutReducer.activeLayoutId,
  );

  const activeLayout =
    layouts.find((l: any) => l.id === activeLayoutId) ?? null;

  const followingPerson = useSelector(
    (state: RootState) => state.layoutReducer.followingPerson,
  );

  const followingPersons = useSelector(
    (state: RootState) =>
      state.layoutReducer.followingPersons ?? [],
  );

  const { data: personList = [], isLoading: personLoading } =
    useLatestPosition('daily');

  // ---------------------------------------------------------
  // Autocomplete State
  // ---------------------------------------------------------

  const [selectedPeople, setSelectedPeople] = useState<PersonOption[]>(
    [],
  );

  const [activeFollowedPeople, setActiveFollowedPeople] = useState<
    PersonOption[]
  >([]);

  /**
   * Controls the Autocomplete popup manually.
   *
   * This is important because we want:
   *
   * - Open when user focuses/searches
   * - Stay open when selecting people
   * - Close when clicking outside
   * - Close when clicking Follow / Stop Following
   */
  const [isPeopleAutocompleteOpen, setIsPeopleAutocompleteOpen] =
    useState(false);

  const autocompleteInputRef =
    useRef<HTMLInputElement | null>(null);

  // ---------------------------------------------------------
  // Sync selected people with Redux following state
  // ---------------------------------------------------------

  useEffect(() => {
    const currentFollowed =
      followingPersons.length > 0
        ? followingPersons
        : followingPerson
          ? [followingPerson]
          : [];

    setSelectedPeople((prev) => {
      if (
        prev.length === currentFollowed.length &&
        prev.every(
          (p, i) => p.id === currentFollowed[i]?.id,
        )
      ) {
        return prev;
      }

      return currentFollowed;
    });

    setActiveFollowedPeople((prev) => {
      if (
        prev.length === currentFollowed.length &&
        prev.every(
          (p, i) => p.id === currentFollowed[i]?.id,
        )
      ) {
        return prev;
      }

      return currentFollowed;
    });
  }, [followingPerson, followingPersons]);

  // ---------------------------------------------------------
  // People List
  // ---------------------------------------------------------

  const allPeople: PersonOption[] = useMemo(() => {
    return personList.map((person: any) => ({
      id: person.personId,
      name: person.personName,
      bleCardNumber: person.bleCardNumber,
      type: person.personType,
    }));
  }, [personList]);

  // ---------------------------------------------------------
  // Styled AppBar
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // Follow Persons
  // ---------------------------------------------------------

  const handleFollowPersonsSubmit = () => {
    if (!selectedPeople.length) {
      handleCancelFollowing();
      return;
    }

    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];

    // -------------------------------------------------------
    // Stop MQTT for people that were unselected
    // -------------------------------------------------------

    const newSet = new Set(
      selectedPeople.map((p) => p.id),
    );

    activeFollowedPeople.forEach((person) => {
      if (
        !newSet.has(person.id) &&
        person.bleCardNumber
      ) {
        const topic =
          `people_tracking/${appId.toUpperCase()}/highlight/card/${person.bleCardNumber}`;

        publishMQTT(topic, 'Stop');

        console.log(
          `Stopped following ${person.name}`,
        );
      }
    });

    // -------------------------------------------------------
    // Start MQTT for newly selected people
    // -------------------------------------------------------

    const previousSet = new Set(
      activeFollowedPeople.map((p) => p.id),
    );

    selectedPeople.forEach((person) => {
      if (
        !previousSet.has(person.id) &&
        person.bleCardNumber
      ) {
        const topic =
          `people_tracking/${appId.toUpperCase()}/highlight/card/${person.bleCardNumber}`;

        publishMQTT(topic, 'Start');

        console.log(
          `Started following ${person.name}`,
        );
      }
    });

    // -------------------------------------------------------
    // Primary person
    // -------------------------------------------------------

    const primaryPerson = selectedPeople[0];

    // -------------------------------------------------------
    // Update screen display
    // -------------------------------------------------------

    if (firstScreen) {
      dispatch(
        setScreenDisplay({
          layoutId: activeLayoutId,
          screenId: firstScreen.id,
          display: {
            displayType: 3,
            displayOutput: primaryPerson.bleCardNumber,
          },
        }),
      );
    }

    // -------------------------------------------------------
    // Update Redux state
    // -------------------------------------------------------

    dispatch(setFollowingPerson(primaryPerson));
    dispatch(setFollowingPersons(selectedPeople));

    setActiveFollowedPeople(selectedPeople);

    toast.success(
      `Following ${selectedPeople.length} person(s)`,
    );

    // -------------------------------------------------------
    // Explicitly close Autocomplete
    // -------------------------------------------------------

    setIsPeopleAutocompleteOpen(false);
  };

  // ---------------------------------------------------------
  // Cancel / Stop Following
  // ---------------------------------------------------------

  const handleCancelFollowing = () => {
    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];

    // -------------------------------------------------------
    // Stop MQTT for all currently followed people
    // -------------------------------------------------------

    const peopleToStop =
      activeFollowedPeople.length > 0
        ? activeFollowedPeople
        : followingPerson
          ? [followingPerson]
          : [];

    peopleToStop.forEach((person) => {
      if (person.bleCardNumber) {
        const topic =
          `people_tracking/${appId.toUpperCase()}/highlight/card/${person.bleCardNumber}`;

        publishMQTT(topic, 'Stop');
      }
    });

    // -------------------------------------------------------
    // Reset screen display
    // -------------------------------------------------------

    if (firstScreen) {
      dispatch(
        setScreenDisplay({
          layoutId: activeLayoutId,
          screenId: firstScreen.id,
          display: {
            displayType: 0,
            displayOutput: '',
          },
        }),
      );
    }

    // -------------------------------------------------------
    // Reset Redux state
    // -------------------------------------------------------

    dispatch(setFollowingPerson(null));
    dispatch(setFollowingPersons([]));

    setActiveFollowedPeople([]);
    setSelectedPeople([]);

    console.log('🛑 Stop following');

    // -------------------------------------------------------
    // Explicitly close Autocomplete
    // -------------------------------------------------------

    setIsPeopleAutocompleteOpen(false);
  };

  // ---------------------------------------------------------
  // Dummy Alarm
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // Restart Engine
  // ---------------------------------------------------------

  const handleClick = async () => {
    try {
      await dispatch(restartEngine('admin'));

      // handle success
    } catch (error) {
      // handle error
    }
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    !isFullscreen && (
      <AppBarStyled
        position="sticky"
        color="default"
      >
        <ToolbarStyled>

          {/* ------------------------------------------- */}
          {/* Toggle Button Sidebar */}
          {/* ------------------------------------------- */}

          <IconButton
            color="inherit"
            aria-label="menu"
            onMouseEnter={() =>
              dispatch(hoverSidebar(true))
            }
            onMouseLeave={() =>
              dispatch(hoverSidebar(false))
            }
            onClick={
              lgUp
                ? () =>
                    dispatch(
                      hoverSidebar(!isSidebarHover),
                    )
                : () =>
                    dispatch(
                      toggleMobileSidebar(),
                    )
            }
          >
            <IconMenu2 size="20" />
          </IconButton>

          {/* ------------------------------------------- */}
          {/* Logo */}
          {/* ------------------------------------------- */}

          <Box px={3}>
            <Logo />
          </Box>

          {/* ------------------------------------------- */}
          {/* Navigation */}
          {/* ------------------------------------------- */}

          <NavListing pathDirect={pathDirect} />

          {/* ------------------------------------------- */}
          {/* Spacer */}
          {/* ------------------------------------------- */}

          <Box flexGrow={1} />

          {/* ------------------------------------------- */}
          {/* Right Header Controls */}
          {/* ------------------------------------------- */}

          {!pathDirect.includes('/config') && (
            <Stack
              spacing={1}
              direction="row"
              alignItems="center"
            >

              {/* --------------------------------------- */}
              {/* Layout Selector */}
              {/* --------------------------------------- */}

              <Typography
                variant="h5"
                fontWeight={900}
              >
                Layout :
              </Typography>

              <Select
                value={activeLayoutId ?? ''}
                onChange={(e) =>
                  dispatch(
                    setActiveLayout(e.target.value),
                  )
                }
                variant="outlined"
                size="small"
                sx={{
                  minWidth: '220px',
                  fontWeight: 'bold',
                }}
                displayEmpty
              >
                <MenuItem
                  value=""
                  disabled
                >
                  -- Select Layout --
                </MenuItem>

                {layouts.map((layout: any) => (
                  <MenuItem
                    key={layout.id}
                    value={layout.id}
                  >
                    {layout.name || 'Unnamed Layout'}
                  </MenuItem>
                ))}
              </Select>

              {/* --------------------------------------- */}
              {/* Visitor / People Search */}
              {/* --------------------------------------- */}

<ClickAwayListener
  onClickAway={() => {
    setIsPeopleAutocompleteOpen(false);
  }}
>
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    <Autocomplete
      multiple
      open={isPeopleAutocompleteOpen}
      disableCloseOnSelect
      disablePortal

      onOpen={() => {
        setIsPeopleAutocompleteOpen(true);
      }}

      /*
       * IMPORTANT:
       *
       * Do NOT call setIsPeopleAutocompleteOpen(false)
       * from onClose.
       *
       * MUI can call onClose because of blur/select/etc.
       * We let ClickAwayListener handle outside clicks instead.
       */
      onClose={() => {
        // Intentionally do nothing.
      }}

      value={selectedPeople}
      onChange={(_, newValue) => {
        setSelectedPeople(newValue);

        // Keep dropdown open after selecting
        setIsPeopleAutocompleteOpen(true);
      }}

      options={allPeople}
      loading={personLoading}
      getOptionLabel={(option) => option.name || ''}
      isOptionEqualToValue={(option, value) =>
        option.id === value.id
      }
      renderTags={() => null}
      sx={{ width: 280 }}

      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={autocompleteInputRef}
          label="Search People"
          size="small"
          placeholder="Search People"

          onFocus={() => {
            setIsPeopleAutocompleteOpen(true);
          }}
        />
      )}

      renderOption={(props, option, { selected }) => (
        <li
          {...props}
          key={option.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700}>
              {option.name}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {option.bleCardNumber} • {option.type}
            </Typography>
          </Box>

          <Checkbox
            icon={icon}
            checkedIcon={checkedIcon}
            style={{ marginRight: 0 }}
            checked={selected}
          />
        </li>
      )}

      PaperComponent={({ children, ...paperProps }) => (
        <Paper
          {...paperProps}
          elevation={8}
          sx={{
            overflow: 'hidden',
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
          }}
        >
          {children}

          <Divider />

          <Box
            p={1}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            sx={{
              backgroundColor: 'background.paper',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            {activeFollowedPeople.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelFollowing}
              >
                Stop Following
              </Button>
            )}

            <Button
              variant="contained"
              color="primary"
              size="small"
              fullWidth={
                activeFollowedPeople.length === 0
              }
              onClick={handleFollowPersonsSubmit}
            >
              {selectedPeople.length === 0
                ? 'Clear & Close'
                : `Follow Persons (${selectedPeople.length})`}
            </Button>
          </Box>
        </Paper>
      )}
    />
  </Box>
</ClickAwayListener>

              {/* --------------------------------------- */}
              {/* Dummy Alarm */}
              {/* --------------------------------------- */}

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
                  <IconBellRinging
                    size="21"
                    stroke="1.5"
                  />
                </Button>
              </Tooltip>

              {/* --------------------------------------- */}
              {/* Restart Engine */}
              {/* --------------------------------------- */}

              <Tooltip title="Restart Engine">
                <IconButton
                  size="large"
                  color="inherit"
                  onClick={handleClick}
                >
                  <IconRestore
                    size="21"
                    stroke="1.5"
                  />
                </IconButton>
              </Tooltip>

              {/* <Profile /> */}
            </Stack>
          )}

          {/* ------------------------------------------- */}
          {/* Right Side Clock */}
          {/* ------------------------------------------- */}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <TimeDisplay />
          </Box>

        </ToolbarStyled>

        <Divider />
      </AppBarStyled>
    )
  );
};

export default Header;