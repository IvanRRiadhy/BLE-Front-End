import { Box, Grid2 as Grid, Typography, Toolbar, styled, Drawer } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppState, useDispatch } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import { useTheme } from '@mui/material';
import ConfigSidebar from 'src/components/dashboards/monitoring/config/ConfigSidebar';
import ConfigPreview from 'src/components/dashboards/monitoring/config/ConfigPreview';
import { useEffect, useState } from 'react';
import { toggleHorizontal, toggleSidebar } from 'src/store/customizer/CustomizerSlice';

const Config = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [selectedGrid, setSelectedGrid] = useState('1');
  const [selectedScreen, setSelectedScreen] = useState('');
  const grid = useSelector((state: AppState) => state.layoutReducer.grid); // Get the current grid value
  const floorLists = useSelector((state: AppState) => state.floorplanReducer.floorplans); // Get the current floor IDs
  const customizer = useSelector((state: AppState) => state.customizer);
  useEffect(() => {
    // Dispatch actions when the component is mounted
    dispatch(toggleHorizontal(false)); // Enable horizontal layout
    dispatch(toggleSidebar()); // Disable sidebar

    // Optionally, clean up when the component is unmounted
    return () => {
      dispatch(toggleHorizontal(true)); // Reset horizontal layout
      dispatch(toggleSidebar()); // Reset sidebar
    };
  }, [dispatch]);

  return (
    <>
      <PageContainer title="Monitoring Config" description="Monitoring Config">
        <ConfigSidebar
          setSelectedGrid={setSelectedGrid}
          setSelectedScreens={setSelectedScreen}
          previewSelectedScreen={selectedScreen}
        />
        <ConfigPreview
          selectedGrid={parseInt(selectedGrid)}
          selectedScreen={parseInt(selectedScreen)}
          setSelectedScreen={setSelectedScreen}
        />
      </PageContainer>
    </>
  );
};

export default Config;
