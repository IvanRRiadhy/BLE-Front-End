import {
  Box,
  Typography,
  Drawer,
  SelectChangeEvent,
  MenuItem,
  Divider,
  Button,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState, useDispatch } from 'src/store/Store';
import { useTheme } from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import React, { ChangeEvent, useEffect, useState } from 'react';
import {
  setActiveLayout,
  addLayout,
  updateLayoutGrid,
  setFocus,
  fetchMonitoringLayouts,
  addMonitoringLayout,
  setScreenFloorplan,
  updateActiveLayoutInfo,
  clearActiveLayout,
  deleteMonitoringLayout,
  editMonitoringLayout,
} from 'src/store/apps/monitoring/layout';
import { fetchFloorplanDT, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchBuildingDT, BuildingType } from 'src/store/apps/crud/building';
import { fetchFloorDT, floorType } from 'src/store/apps/crud/floor';
import { fetchMaskedAreaDT, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { CCTVType, fetchAccessCCTV } from 'src/store/apps/crud/accessCCTV';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';

interface ConfigSidebarProps {
  onGridChange: (grid: number) => void;
  onScreenUpdate: (
    screenIndex: number,
    preview: { type: number; floorplanId?: string; displayOutput?: string },
  ) => void;
  screenSettings?: { scale: number; translateX: number; translateY: number };
  selectedScreen: number | null;
  setSelectedScreen: (index: number | null) => void;
  selectedFloorplanId: string | null;
}

const filter = { draw: 1, start: 0, length: 99, sortColumn: '', sortDir: 'asc', SearchValue: '' };

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  onGridChange,
  onScreenUpdate,
  screenSettings,
  selectedScreen,
  setSelectedScreen,
  selectedFloorplanId,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  // --- Redux data ---
  const floorplanLists: FloorplanType[] = useSelector(
    (s: RootState) => s.floorplanReducer.floorplans,
  );
  const buildingLists: BuildingType[] = useSelector((s: RootState) => s.buildingReducer.buildings);
  const floorLists: floorType[] = useSelector((s: RootState) => s.floorReducer.floors);
  const areaLists: MaskedAreaType[] = useSelector(
    (s: RootState) => s.maskedAreaReducer.maskedAreas,
  );
  const cctvLists: CCTVType[] = useSelector((s: RootState) => s.CCTVReducer.cctvs);
  const floorplanDeviceLists: FloorplanDeviceType[] = useSelector(
    (s: RootState) => s.floorplanDeviceReducer.floorplanDevices,
  );

  const layouts = useSelector((s: RootState) => s.layoutReducer.layouts ?? []);
  const activeLayoutId = useSelector((s: RootState) => s.layoutReducer.activeLayoutId);
  const activeLayout = layouts.find((l) => l.id === activeLayoutId) || null;

  // --- Local state ---
  const [selectedLayout, setSelectedLayoutLocal] = useState(activeLayoutId || '');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedFloorplan, setSelectedFloorplan] = useState('');
  const [selectedMaskedArea, setSelectedMaskedArea] = useState('');
  const [selectedCCTV, setSelectedCCTV] = useState('');

  // --- Derived lists ---
  const filteredFloor = floorLists.filter((f) => f.buildingId === selectedBuilding);
  const filteredFloorplan = floorplanLists.filter((f) => f.floorId === selectedFloor);
  const filteredMaskedArea = areaLists.filter((a) => a.floorplanId === selectedFloorplan);
  const filteredFloorplanDevice = floorplanDeviceLists.filter(
    (d) => d.floorplanMaskedAreaId === selectedMaskedArea,
  );
  const filteredCCTV = cctvLists.filter((cctv) =>
    filteredFloorplanDevice.some((d) => d.type === 'Cctv' && d.accessCctvId === cctv.id),
  );

  // --- Handlers ---
  const handleLayoutChange = (e: SelectChangeEvent<string>) => {
    const layoutId = e.target.value;
    setSelectedLayoutLocal(layoutId);
    dispatch(setActiveLayout(layoutId));

    setSelectedScreen(null);
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedFloorplan('');
    setSelectedMaskedArea('');
    setSelectedCCTV('');
  };

  const handleCreateLayout = () => {
    const newLayoutName = `Layout ${layouts.length + 1}`;
    dispatch(addLayout({ name: newLayoutName, grid: 1 }));
  };

  const handleGridChange = (e: SelectChangeEvent<string>) => {
    const grid = parseInt(e.target.value);
    if (activeLayout) dispatch(updateLayoutGrid({ layoutId: activeLayout.id, grid }));
    setSelectedScreen(null);
    onGridChange(grid); // live preview update
  };

  const handleScreenChange = (e: SelectChangeEvent<string>) => {
    const index = parseInt(e.target.value);
    setSelectedScreen(index);
    if (activeLayout) {
      const screenId = activeLayout.screens[index].id;
      dispatch(setFocus({ type: 'screen', id: screenId }));
    }
  };

  // When clicking Preview button
  const handlePreview = () => {
    if (selectedScreen === null) return;

    const displayType =
      selectedCCTV !== '' && selectedCCTV !== 'None'
        ? 2
        : selectedMaskedArea !== '' && selectedMaskedArea !== 'None'
        ? 1
        : 0;

    const displayOutput =
      selectedCCTV !== '' && selectedCCTV !== 'None'
        ? selectedCCTV
        : selectedMaskedArea !== '' && selectedMaskedArea !== 'None'
        ? selectedMaskedArea
        : selectedFloorplan;

    onScreenUpdate(selectedScreen, {
      type: displayType,
      floorplanId: selectedFloorplan,
      displayOutput,
    });
  };

  // --- Load reference data on mount ---
  useEffect(() => {
    dispatch(fetchMonitoringLayouts());
    dispatch(fetchBuildingDT(filter));
    dispatch(fetchFloorDT(filter));
    dispatch(fetchFloorplanDT(filter));
    dispatch(fetchMaskedAreaDT(filter));
    dispatch(fetchAccessCCTV());
  }, [dispatch]);

  useEffect(() => {
    if (activeLayoutId) {
      setSelectedLayoutLocal(activeLayoutId);
    }
  }, [activeLayoutId]);

  // --- Auto-select first layout ---
  useEffect(() => {
    if (!activeLayoutId && layouts.length > 0) {
      dispatch(setActiveLayout(layouts[0].id));
      setSelectedLayoutLocal(layouts[0].id);
    }
  }, [layouts, activeLayoutId, dispatch]);

  useEffect(() => {
    console.log('selectedFloorplanId', selectedFloorplanId);
    if (selectedFloorplanId && floorplanLists.length > 0) {
      // 1️⃣ Find floorplan
      const fp = floorplanLists.find((f) => f.id === selectedFloorplanId);
      if (fp) {
        setSelectedFloorplan(fp.id);

        // 2️⃣ Find floor
        const floor = floorLists.find((fl) => fl.id === fp.floorId);
        if (floor) {
          setSelectedFloor(floor.id);

          // 3️⃣ Find building
          const building = buildingLists.find((b) => b.id === floor.buildingId);
          if (building) {
            setSelectedBuilding(building.id);
          }
        }
      }
    } else {
      // reset if no floorplan selected
      setSelectedBuilding('');
      setSelectedFloor('');
      setSelectedFloorplan('');
    }
  }, [selectedFloorplanId, floorplanLists, floorLists, buildingLists]);

  // --- JSX ---
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
      <Box
        sx={{
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          // p: 2,
          boxShadow: 2,
          height: 'calc(100vh - 120px)', // keeps it nicely within viewport under header
          overflowY: 'auto',
        }}
      >
        <Typography variant="h4" color="primary" fontWeight="bold" sx={{ padding: 2 }}>
          Layout Configuration
        </Typography>
        <Divider />
        <Box sx={{ padding: 2, overflowY: 'auto', height: 'calc(100% - 64px)' }}>
          {/* Layout selector */}
          <CustomFormLabel>Layout</CustomFormLabel>
          <CustomSelect value={selectedLayout} onChange={handleLayoutChange} fullWidth>
            <MenuItem value="" disabled>
              -- Select Layout --
            </MenuItem>
            {layouts.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </CustomSelect>
          <Button variant="outlined" onClick={handleCreateLayout} sx={{ mt: 1, mb: 2 }}>
            Create New Layout
          </Button>

          {activeLayout && (
            <>
              <CustomFormLabel>Layout Name</CustomFormLabel>
              <CustomTextField
                fullWidth
                value={activeLayout.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  dispatch(updateActiveLayoutInfo({ name: e.target.value }))
                }
                placeholder="Enter layout name"
                sx={{ mb: 2 }}
              />

              <CustomFormLabel>Layout Description</CustomFormLabel>
              <CustomTextField
                fullWidth
                multiline
                rows={2}
                value={activeLayout.description ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  dispatch(updateActiveLayoutInfo({ description: e.target.value }))
                }
                placeholder="Enter layout description"
                sx={{ mb: 3 }}
              />
            </>
          )}

          {/* Grid selector */}
          {activeLayout && (
            <>
              <CustomFormLabel>Grid</CustomFormLabel>
              <CustomSelect value={String(activeLayout.grid)} onChange={handleGridChange} fullWidth>
                {Array.from({ length: 6 }, (_, i) => (
                  <MenuItem key={i + 1} value={String(i + 1)}>
                    {i + 1} Screen{i + 1 > 1 ? 's' : ''}
                  </MenuItem>
                ))}
              </CustomSelect>
            </>
          )}

          {/* Screen selector */}
          {activeLayout && (
            <>
              <CustomFormLabel>Screen</CustomFormLabel>
              <CustomSelect
                value={selectedScreen !== null ? String(selectedScreen) : ''}
                onChange={(e: SelectChangeEvent<string>) => {
                  const index = parseInt(e.target.value);
                  setSelectedScreen(index);
                  handleScreenChange(e); // keep existing logic if you want it to update Redux focus
                }}
                fullWidth
              >
                <MenuItem value="" disabled>
                  -- Select Screen --
                </MenuItem>
                {activeLayout.screens.map((_, idx) => (
                  <MenuItem key={idx} value={String(idx)}>
                    Screen {idx + 1}
                  </MenuItem>
                ))}
              </CustomSelect>
            </>
          )}

          {/* Floorplan / MaskedArea / CCTV */}
          {selectedScreen !== null && (
            <>
              {/* Building */}
              <CustomFormLabel>Building</CustomFormLabel>
              <CustomSelect
                value={selectedBuilding}
                onChange={(e: SelectChangeEvent<string>) => {
                  const buildingId = e.target.value;
                  setSelectedBuilding(buildingId);

                  // Reset dependent fields when building changes
                  setSelectedFloor('');
                  setSelectedFloorplan('');
                  setSelectedMaskedArea('');
                  setSelectedCCTV('');
                }}
                fullWidth
              >
                <MenuItem value="" disabled>
                  -- Select Building --
                </MenuItem>
                {buildingLists.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </CustomSelect>

              {/* Floor - only show after building selected */}
              {selectedBuilding && (
                <>
                  <CustomFormLabel>Floor</CustomFormLabel>
                  <CustomSelect
                    value={selectedFloor}
                    onChange={(e: SelectChangeEvent<string>) => {
                      const floorId = e.target.value;
                      setSelectedFloor(floorId);

                      // Reset lower levels
                      setSelectedFloorplan('');
                      setSelectedMaskedArea('');
                      setSelectedCCTV('');
                    }}
                    fullWidth
                  >
                    <MenuItem value="" disabled>
                      -- Select Floor --
                    </MenuItem>
                    {filteredFloor.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </>
              )}

              {/* Floorplan - only show after floor selected */}
              {selectedFloor && (
                <>
                  <CustomFormLabel>Floorplan</CustomFormLabel>
                  <CustomSelect
                    value={selectedFloorplan}
                    onChange={(e: SelectChangeEvent<string>) => {
                      const newFloorplanId = e.target.value;
                      setSelectedFloorplan(newFloorplanId);

                      // Reset lower levels
                      setSelectedMaskedArea('');
                      setSelectedCCTV('');

                      // Also update Redux layout state for the selected screen
                      if (activeLayout && selectedScreen !== null) {
                        const screenId = activeLayout.screens[selectedScreen].id;
                        dispatch(
                          setScreenFloorplan({
                            layoutId: activeLayout.id,
                            screenId,
                            floorplanId: newFloorplanId,
                          }),
                        );
                      }
                    }}
                    fullWidth
                  >
                    <MenuItem value="" disabled>
                      -- Select Floorplan --
                    </MenuItem>
                    {filteredFloorplan.map((fp) => (
                      <MenuItem key={fp.id} value={fp.id}>
                        {fp.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </>
              )}

              {/* Masked Area - only show after floorplan selected */}
              {selectedFloorplan && (
                <>
                  <CustomFormLabel>Masked Area</CustomFormLabel>
                  <CustomSelect
                    value={selectedMaskedArea}
                    onChange={(e: SelectChangeEvent<string>) => {
                      const maskedId = e.target.value;
                      setSelectedMaskedArea(maskedId);

                      // Reset CCTV if masked area changes
                      setSelectedCCTV('');
                    }}
                    fullWidth
                  >
                    <MenuItem value="None">None</MenuItem>
                    {filteredMaskedArea.map((ma) => (
                      <MenuItem key={ma.id} value={ma.id}>
                        {ma.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </>
              )}

              {/* CCTV - only show after masked area selected */}
              {selectedMaskedArea && (
                <>
                  <CustomFormLabel>CCTV</CustomFormLabel>
                  <CustomSelect
                    value={selectedCCTV}
                    onChange={(e: SelectChangeEvent<string>) => setSelectedCCTV(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="None">None</MenuItem>
                    {filteredCCTV.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </>
              )}
            </>
          )}
          {/* --- Layout Action Buttons --- */}
          <Box mt={2}>
            {/* Row: Save + Clear */}
            <Box display="flex" justifyContent="space-between" gap={1} mb={1}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => {
                  if (!activeLayout) return;

                  // 🧠 Detect if layout is new or existing
                  const isNewLayout = activeLayout.id.startsWith('layout-');

                  if (isNewLayout) {
                    console.log('🆕 Creating new layout...');
                    dispatch(addMonitoringLayout(activeLayout));
                  } else {
                    console.log('✏️ Editing existing layout...');
                    dispatch(editMonitoringLayout(activeLayout));
                  }
                }}
              >
                Save Layout
              </Button>

              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={() => {
                  if (!activeLayoutId) return;
                  dispatch(clearActiveLayout());

                  // 🧹 Reset sidebar local states
                  setSelectedBuilding('');
                  setSelectedFloor('');
                  setSelectedFloorplan('');
                  setSelectedMaskedArea('');
                  setSelectedCCTV('');
                  setSelectedScreen(null);
                }}
              >
                Clear Layout
              </Button>
            </Box>

            {/* Row: Delete (full width) */}
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={() => {
                if (!activeLayoutId) return;
                if (window.confirm('Are you sure you want to delete this layout?')) {
                  dispatch(deleteMonitoringLayout(activeLayoutId));
                }

                // 🧹 Reset sidebar local states
                setSelectedBuilding('');
                setSelectedFloor('');
                setSelectedFloorplan('');
                setSelectedMaskedArea('');
                setSelectedCCTV('');
                setSelectedScreen(null);
              }}
            >
              Delete Layout
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ConfigSidebar;
