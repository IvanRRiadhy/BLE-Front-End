import {
  Box,
  Grid2 as Grid,
  Typography,
  Toolbar,
  styled,
  Drawer,
  SelectChangeEvent,
  MenuItem,
  Divider,
  Button,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState, useDispatch } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import { useTheme } from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import React, { useEffect, useState } from 'react';
import { floorplanType } from 'src/types/tracking/floorplan';
import { fetchFloorplans } from 'src/store/apps/tracking/FloorPlanSlice';
import { setFloorplan } from 'src/store/apps/monitoring/layout';

interface configSidebarProps {
  setSelectedGrid: (grid: string) => void;
  setSelectedScreens: (screen: string) => void;
  previewSelectedScreen: string;
}

const ConfigSidebar: React.FC<configSidebarProps> = ({
  setSelectedGrid,
  setSelectedScreens,
  previewSelectedScreen,
}: configSidebarProps) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const grid = useSelector((state: AppState) => state.layoutReducer.grid); // Get the current grid value
  const floorLists: floorplanType[] = useSelector(
    (state: AppState) => state.floorplanReducer.floorplans,
  ); // Get the current floor IDs
  const customizer = useSelector((state: AppState) => state.customizer);
  const [buildingList, setBuildingList] = useState([
    { id: '1', name: 'Building 1' },
    { id: '2', name: 'Building 2' },
    { id: '3', name: 'Building 3' },
    { id: '4', name: 'Building 4' },
    { id: '5', name: 'Building 5' },
  ]);

  const [gridType, setGridType] = useState('1');
  const [selectedScreen, setSelectedScreen] = useState(previewSelectedScreen || '');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');

  const handleChange = (event: SelectChangeEvent<string>) => {
    setGridType(event.target.value); // Dispatch the selected grid value
    setSelectedGrid(event.target.value);
    setSelectedScreens('');
    setSelectedScreen('');
    setSelectedBuilding('');
    setSelectedFloor('');
  };

  const handleScreenChange = (event: SelectChangeEvent<string>) => {
    setSelectedScreen(event.target.value); // Dispatch the selected screen value
    setSelectedScreens(event.target.value);
    setSelectedBuilding('');
    setSelectedFloor('');
  };
  const handleBuildingChange = (event: SelectChangeEvent<string>) => {
    setSelectedBuilding(event.target.value); // Dispatch the selected building value
    setSelectedFloor('');
  };
  const handleFloorChange = (event: SelectChangeEvent<string>) => {
    setSelectedFloor(event.target.value); // Dispatch the selected floor value
  };

  const handleSave = () => {
    dispatch(setFloorplan(parseInt(gridType), parseInt(selectedScreen), selectedFloor));
    setSelectedScreens('');
    setSelectedScreen('');
    setSelectedBuilding('');
    setSelectedFloor('');
  };

  useEffect(() => {
    setSelectedScreen(previewSelectedScreen);
  }, [previewSelectedScreen]);

  useEffect(() => {
    dispatch(fetchFloorplans());
  }, [dispatch]);

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
          <Box
            sx={{
              height: `calc(100% - ${customizer.TopbarHeight}px)`,
            }}
          >
            <Typography variant="h4" color="primary" fontWeight={'bold'} sx={{ padding: 4 }}>
              Grid Configuration
            </Typography>
            <Divider />
            <Grid container mb={2} sx={{ padding: 2, paddingTop: 0 }}>
              <Grid size={{ lg: 12, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="grid-type">Grid Type</CustomFormLabel>
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
                    <CustomFormLabel htmlFor="grid-type">Screen</CustomFormLabel>
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
                    <CustomFormLabel htmlFor="grid-type">Building</CustomFormLabel>
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
                      {buildingList.map((building) => (
                        <MenuItem key={building.id} value={building.id}>
                          {building.name}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </>
                )}
                {selectedBuilding !== '' && (
                  <>
                    <CustomFormLabel htmlFor="grid-type">Floor</CustomFormLabel>
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
                      {floorLists.map((floor) => (
                        <MenuItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                    <Button
                      onClick={handleSave}
                      variant="contained"
                      sx={{ fontSize: '1rem', py: 1, px: 3, mt: 2 }}
                      disabled={selectedFloor === ''}
                    >
                      Save
                    </Button>
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
