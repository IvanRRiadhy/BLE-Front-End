import {
  Box,
  Grid2 as Grid,
  Typography,
  Drawer,
  SelectChangeEvent,
  MenuItem,
  Divider,
  Button,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState, useDispatch } from 'src/store/Store';
import { useTheme } from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import React, { useEffect, useState } from 'react';
// import { floorplanType } from 'src/types/tracking/floorplan';
// import { fetchFloorplans } from 'src/store/apps/tracking/FloorPlanSlice';
import {
  resetScreen,
  setFloorplan,
  setScreenDisplay,
  setScreenSettings,
} from 'src/store/apps/monitoring/layout';
import { fetchFloorplan, fetchFloorplanDT, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchBuildings, BuildingType, fetchBuildingDT } from 'src/store/apps/crud/building';
import { fetchFloorDT, fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchMaskedAreaDT, fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { CCTVType, fetchAccessCCTV } from 'src/store/apps/crud/accessCCTV';

interface configSidebarProps {
  setSelectedGrid: (grid: string) => void;
  setSelectedScreens: (screen: string) => void;
  previewSelectedScreen: string;
  screenSettings?: { scale: number; translateX: number; translateY: number };
}

const filter = {
  draw: 1,
  start: 0,
  length: 99,
  sortColumn: '',
  sortDir: 'asc',
  searchValue: '',
};

const ConfigSidebar: React.FC<configSidebarProps> = ({
  setSelectedGrid,
  setSelectedScreens,
  previewSelectedScreen,
  screenSettings,
}: configSidebarProps) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const floorplanLists: FloorplanType[] = useSelector(
    (state: AppState) => state.floorplanReducer.floorplans,
  );
  const buildingLists: BuildingType[] = useSelector(
    (state: AppState) => state.buildingReducer.buildings,
  );
  const floorLists: floorType[] = useSelector((state: AppState) => state.floorReducer.floors);
  const areaLists: MaskedAreaType[] = useSelector(
    (state: AppState) => state.maskedAreaReducer.maskedAreas,
  );
  const cctvLists: CCTVType[] = useSelector((state: AppState) => state.CCTVReducer.cctvs);
  const floorplanDeviceLists: FloorplanDeviceType[] = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.floorplanDevices,
  );
  const customizer = useSelector((state: AppState) => state.customizer);
  const floorplanId = useSelector((state: AppState) => state.layoutReducer.floorplanId);
  const screenDisplay = useSelector((state: AppState) => state.layoutReducer.screenDisplay);
  // const [buildingList, setBuildingList] = useState([
  //   { id: '1', name: 'Building 1' },
  //   { id: '2', name: 'Building 2' },
  //   { id: '3', name: 'Building 3' },
  //   { id: '4', name: 'Building 4' },
  //   { id: '5', name: 'Building 5' },
  // ]);

  const [gridType, setGridType] = useState('1');
  const [selectedScreen, setSelectedScreen] = useState(previewSelectedScreen || '');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedFloorplan, setSelectedFloorplan] = useState('');
  const [selectedMaskedArea, setSelectedMaskedArea] = useState('');
  const [selectedCCTV, setSelectedCCTV] = useState('');
  const filteredFloorplan = floorplanLists.filter(
    (floorplan) => floorplan.floorId === selectedFloor,
  );
  const filteredFloor = floorLists.filter((floor) => floor.buildingId === selectedBuilding);
  const filteredMaskedArea = areaLists.filter((area) => area.floorplanId === selectedFloorplan);
  const filteredFloorplanDevice = floorplanDeviceLists.filter(
    (device) => device.floorplanMaskedAreaId === selectedMaskedArea,
  );
  const filteredCCTV = cctvLists.filter((cctv) =>
    filteredFloorplanDevice
      .map((device) => device.type === 'Cctv' && device.accessCctvId)
      .includes(cctv.id),
  );
  const handleChange = (event: SelectChangeEvent<string>) => {
    setGridType(event.target.value); // Dispatch the selected grid value
    setSelectedGrid(event.target.value);
    setSelectedScreens('');
    setSelectedScreen('');
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedFloorplan('');
    setSelectedMaskedArea('');
    setSelectedCCTV('');
  };

  const handleScreenChange = (event: SelectChangeEvent<string>) => {
    setSelectedScreen(event.target.value); // Dispatch the selected screen value
    setSelectedScreens(event.target.value);
    console.log('APPOOKS');
    if (floorplanId[parseInt(gridType)][parseInt(event.target.value) - 1] !== '') {
      console.log(
        'ASDQEW',
        screenDisplay[parseInt(gridType)][parseInt(event.target.value) - 1].displayType,
      );
      if (screenDisplay[parseInt(gridType)][parseInt(event.target.value) - 1].displayType === 0) {
        setSelectedFloorplan(floorplanId[parseInt(gridType)][parseInt(event.target.value) - 1]);
      }
      if (screenDisplay[parseInt(gridType)][parseInt(event.target.value) - 1].displayType === 1) {
        setSelectedMaskedArea(
          screenDisplay[parseInt(gridType)][parseInt(event.target.value) - 1].displayOutput,
        );
      }
      if (screenDisplay[parseInt(gridType)][parseInt(event.target.value) - 1].displayType === 2) {
        setSelectedCCTV(
          screenDisplay[parseInt(gridType)][parseInt(event.target.value) - 1].displayOutput,
        );
      }
    } else {
      setSelectedBuilding('');
      setSelectedFloor('');
      setSelectedFloorplan('');
      setSelectedMaskedArea('');
      setSelectedCCTV('');
    }
  };
  const handleBuildingChange = (event: SelectChangeEvent<string>) => {
    setSelectedBuilding(event.target.value); // Dispatch the selected building value
    setSelectedFloor('');
    setSelectedFloorplan('');
    setSelectedMaskedArea('');
    setSelectedCCTV('');
  };
  const handleFloorChange = (event: SelectChangeEvent<string>) => {
    setSelectedFloor(event.target.value); // Dispatch the selected floor value
    setSelectedFloorplan('');
    setSelectedMaskedArea('');
    setSelectedCCTV('');
  };
  const handleFloorplanChange = (event: SelectChangeEvent<string>) => {
    setSelectedFloorplan(event.target.value); // Dispatch the selected floor value
    setSelectedMaskedArea('');
    setSelectedCCTV('');
  };
  const handleMaskedAreaChange = (event: SelectChangeEvent<string>) => {
    setSelectedMaskedArea(event.target.value);
    setSelectedCCTV('');
  };
  const handleCCTVChange = (event: SelectChangeEvent<string>) => {
    setSelectedCCTV(event.target.value);
  };

  const handleSave = () => {
    dispatch(resetScreen(parseInt(gridType), parseInt(selectedScreen)));
    dispatch(setFloorplan(parseInt(gridType), parseInt(selectedScreen), selectedFloorplan));
    dispatch(
      setScreenSettings(parseInt(gridType), parseInt(selectedScreen), {
        scale: screenSettings?.scale || 1,
        translateX: screenSettings?.translateX || 0,
        translateY: screenSettings?.translateY || 0,
      }),
    );
    if (selectedMaskedArea !== '' && selectedMaskedArea !== 'None') {
      if (selectedCCTV !== '' && selectedCCTV !== 'None') {
        dispatch(
          setScreenDisplay(parseInt(gridType), parseInt(selectedScreen), {
            displayType: 2,
            displayOutput: selectedCCTV,
          }),
        );
      } else {
        dispatch(
          setScreenDisplay(parseInt(gridType), parseInt(selectedScreen), {
            displayType: 1,
            displayOutput: selectedMaskedArea,
          }),
        );
      }
    } else {
      dispatch(
        setScreenDisplay(parseInt(gridType), parseInt(selectedScreen), {
          displayType: 0,
          displayOutput: selectedFloorplan,
        }),
      );
    }
    dispatch(setFloorplan(parseInt(gridType), parseInt(selectedScreen), selectedFloorplan));
    setSelectedScreens('');
    setSelectedScreen('');
    setSelectedBuilding('');
    setSelectedFloor('');
    setSelectedFloorplan('');
    setSelectedMaskedArea('');
    setSelectedCCTV('');
  };

  useEffect(() => {
    setSelectedScreen(previewSelectedScreen);
  }, [previewSelectedScreen]);

  useEffect(() => {
    dispatch(fetchFloorplanDT({
      ...filter,
      filter:{
        FloorId: selectedFloor
      }
    }));
    dispatch(fetchBuildingDT(filter));
    dispatch(fetchFloorDT({
      ...filter,
      filter:{
        BuildingId: selectedBuilding
      }
    }));
    dispatch(fetchMaskedAreaDT({
      ...filter,
      filter:{
        FloorId: selectedFloor,
        FloorplanId: selectedFloorplan
      }
    }));
    dispatch(fetchAccessCCTV());
  }, [dispatch]);

  useEffect(() => {
    if (selectedScreen !== '') {
      console.log(
        'AAA',
        screenDisplay[parseInt(gridType)][parseInt(selectedScreen) - 1].displayType,
      );
      if (screenDisplay[parseInt(gridType)][parseInt(selectedScreen) - 1].displayType === 0) {
        setSelectedFloorplan(floorplanId[parseInt(gridType)]?.[parseInt(selectedScreen) - 1]);
        setSelectedMaskedArea('');
        setSelectedCCTV('');
      } else if (
        screenDisplay[parseInt(gridType)][parseInt(selectedScreen) - 1].displayType === 1
      ) {
        console.log('AAA');
        setSelectedMaskedArea(
          screenDisplay[parseInt(gridType)][parseInt(selectedScreen) - 1].displayOutput,
        );
        setSelectedCCTV('');
      } else if (
        screenDisplay[parseInt(gridType)][parseInt(selectedScreen) - 1].displayType === 2
      ) {
        console.log('BBBBB');
        setSelectedCCTV(
          screenDisplay[parseInt(gridType)][parseInt(selectedScreen) - 1].displayOutput,
        );
      } else {
        setSelectedBuilding('');
        setSelectedFloor('');
        setSelectedFloorplan('');
        setSelectedMaskedArea('');
        setSelectedCCTV('');
      }
    }
  }, [selectedScreen, gridType, floorplanId]);

  useEffect(() => {
    if (selectedCCTV !== '') {
      const cctv = floorplanDeviceLists.find(
        (device) => device.type === 'Cctv' && device.accessCctvId === selectedCCTV,
      );
      // console.log('selectedCCTV', selectedCCTV, cctv);
      if (cctv) {
        setSelectedMaskedArea(cctv.floorplanMaskedAreaId);
      }
    }
  }, [selectedCCTV, cctvLists]);

  useEffect(() => {
    if (selectedMaskedArea !== '') {
      const maskedArea = areaLists.find((maskedArea) => maskedArea.id === selectedMaskedArea);
      if (maskedArea) {
        setSelectedFloorplan(maskedArea.floorplanId);
      }
    }
  }, [selectedMaskedArea, areaLists]);

  useEffect(() => {
    if (selectedFloorplan !== '') {
      const floorplan = floorplanLists.find((floorplan) => floorplan.id === selectedFloorplan);
      if (floorplan) {
        setSelectedFloor(floorplan.floorId);
      }
    }
  }, [selectedFloorplan, floorplanLists]);

  useEffect(() => {
    if (selectedFloor !== '') {
      const floor = floorLists.find((floor) => floor.id === selectedFloor);
      if (floor) {
        setSelectedBuilding(floor.buildingId);
      }
    }
  }, [selectedFloor, floorLists]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
      <Box
        sx={{
          width: customizer.SidebarWidth,
          flexShrink: 0,
          marginTop: `calc(${customizer.TopbarHeight}px)`,
          position: 'relative',
        }}
      >
        <Drawer
          anchor="left"
          open
          variant="permanent"
          PaperProps={{
            sx: {
              transition: theme.transitions.create('width', {
                duration: theme.transitions.duration.shortest,
              }),
              width: customizer.SidebarWidth,
              boxSizing: 'border-box',
              marginTop: `calc(${customizer.TopbarHeight}px)`,
              //marginLeft: customizer.isCollapse ? 0 : `${customizer.SidebarWidth}px`,
            },
          }}
        >
          <Typography variant="h4" color="primary" fontWeight={'bold'} sx={{ padding: 4 }}>
            Grid Configuration
          </Typography>
          <Box
            sx={{
              height: `calc(90% - ${customizer.TopbarHeight}px)`,
              overflowY: 'auto',
            }}
          >
            <Divider />
            <Grid container mb={2} sx={{ padding: 2, paddingTop: 0 }}>
              <Grid size={{ lg: 12, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="grid-type">
                  Grid Type {<span style={{ color: 'red' }}>*</span>}
                </CustomFormLabel>
                <CustomSelect
                  name="gridType"
                  value={gridType}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                >
                  <MenuItem value="" disabled>
                    -- Select Grid Type --
                  </MenuItem>
                  <MenuItem value="1">1 Grid</MenuItem>
                  <MenuItem value="2">2 Grid</MenuItem>
                  <MenuItem value="3">3 Grid</MenuItem>
                  <MenuItem value="4">4 Grid</MenuItem>
                  <MenuItem value="5">5 Grid</MenuItem>
                  <MenuItem value="6">6 Grid</MenuItem>
                </CustomSelect>
                {gridType !== '' && (
                  <>
                    <CustomFormLabel htmlFor="screen">
                      Screen {<span style={{ color: 'red' }}>*</span>}
                    </CustomFormLabel>
                    <CustomSelect
                      name="screen"
                      value={selectedScreen}
                      onChange={handleScreenChange}
                      fullWidth
                      variant="outlined"
                    >
                      <MenuItem value="" disabled>
                        -- Select Screen --
                      </MenuItem>
                      {Array.from({ length: parseInt(gridType) }, (_, i) => (
                        <MenuItem key={i} value={i + 1}>
                          Screen {i + 1}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </>
                )}
                {selectedScreen !== '' && (
                  <>
                    <CustomFormLabel htmlFor="building">
                      Building {<span style={{ color: 'red' }}>*</span>}
                    </CustomFormLabel>
                    <CustomSelect
                      name="building"
                      value={selectedBuilding}
                      onChange={handleBuildingChange}
                      fullWidth
                      variant="outlined"
                    >
                      <MenuItem value="" disabled>
                        -- Select Building --
                      </MenuItem>
                      {buildingLists.map((building) => (
                        <MenuItem key={building.id} value={building.id}>
                          {building.name}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </>
                )}
                {selectedBuilding !== '' && (
                  <>
                    <CustomFormLabel htmlFor="floor">
                      Floor {<span style={{ color: 'red' }}>*</span>}
                    </CustomFormLabel>
                    <CustomSelect
                      name="floor"
                      value={selectedFloor}
                      onChange={handleFloorChange}
                      fullWidth
                      variant="outlined"
                    >
                      <MenuItem value="" disabled>
                        -- Select Floor --
                      </MenuItem>
                      {filteredFloor.map((floor) => (
                        <MenuItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </>
                )}
                {selectedFloor !== '' && (
                  <>
                    <CustomFormLabel htmlFor="floor-plan">
                      Floor Plan {<span style={{ color: 'red' }}>*</span>}
                    </CustomFormLabel>
                    <CustomSelect
                      name="floorplan"
                      value={selectedFloorplan}
                      onChange={handleFloorplanChange}
                      fullWidth
                      variant="outlined"
                    >
                      <MenuItem value="" disabled>
                        -- Select Floor --
                      </MenuItem>
                      {filteredFloorplan.map((floorplan) => (
                        <MenuItem key={floorplan.id} value={floorplan.id}>
                          {floorplan.name}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                    {selectedFloorplan !== '' && (
                      <>
                        <CustomFormLabel htmlFor="masked-area">
                          Masked Area (optional)
                        </CustomFormLabel>
                        <CustomSelect
                          name="masked-area"
                          value={selectedMaskedArea}
                          onChange={handleMaskedAreaChange}
                          fullWidth
                          variant="outlined"
                        >
                          <MenuItem value="" disabled>
                            -- Select Masked Area --
                          </MenuItem>
                          <MenuItem value="None">None</MenuItem>
                          {filteredMaskedArea.map((maskedArea) => (
                            <MenuItem key={maskedArea.id} value={maskedArea.id}>
                              {maskedArea.name}
                            </MenuItem>
                          ))}
                        </CustomSelect>
                      </>
                    )}
                    {selectedMaskedArea !== '' && selectedMaskedArea !== 'None' && (
                      <>
                        <CustomFormLabel htmlFor="masked-area">CCTV (optional)</CustomFormLabel>
                        <CustomSelect
                          name="masked-area"
                          value={selectedCCTV}
                          onChange={handleCCTVChange}
                          fullWidth
                          variant="outlined"
                        >
                          <MenuItem value="" disabled>
                            -- Select CCTV --
                          </MenuItem>
                          <MenuItem value="None">None</MenuItem>
                          {filteredCCTV.map((cctv) => (
                            <MenuItem key={cctv.id} value={cctv.id}>
                              {cctv.name}
                            </MenuItem>
                          ))}
                        </CustomSelect>
                      </>
                    )}
                    <Box
                      sx={{
                        position: 'sticky',
                        bottom: 0,
                        backgroundColor: theme.palette.background.paper,
                        zIndex: 2,
                        padding: 2,
                        borderTop: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      <Button
                        onClick={handleSave}
                        variant="contained"
                        sx={{ fontSize: '1rem', py: 1, px: 3, flex: 1 }}
                        disabled={selectedFloorplan === ''}
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          dispatch(resetScreen(parseInt(gridType), parseInt(selectedScreen)));

                          // Reset local state as well
                          setSelectedScreens('');
                          setSelectedScreen('');
                          setSelectedBuilding('');
                          setSelectedFloor('');
                          setSelectedFloorplan('');
                          setSelectedMaskedArea('');
                          setSelectedCCTV('');
                        }}
                        variant="outlined"
                        color="error"
                        sx={{ fontSize: '1rem', py: 1, px: 3, flex: 1 }}
                        disabled={selectedScreen === ''}
                      >
                        Remove
                      </Button>
                    </Box>
                  </>
                )}
              </Grid>
            </Grid>
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
};

export default ConfigSidebar;
