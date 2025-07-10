
import { useSelector } from 'react-redux';
import { AppState, useDispatch } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
// import { useTheme } from '@mui/material';
import ConfigSidebar from 'src/components/dashboards/monitoring/config/ConfigSidebar';
import { useEffect, useMemo, useState } from 'react';
import { toggleHorizontal, toggleSidebar } from 'src/store/customizer/CustomizerSlice';
import ConfigGrid from 'src/components/dashboards/monitoring/config/ConfigGrid';

const Config = () => {
  const dispatch = useDispatch();
  // const theme = useTheme();
  const [selectedGrid, setSelectedGrid] = useState('1');
  const [selectedScreen, setSelectedScreen] = useState('');
  const [screenSettings, setScreenSettings] = useState<{ scale: number; translateX: number; translateY: number }>({
  scale: 1,
  translateX: 0,
  translateY: 0,
});
    const floorIds = useSelector((state: AppState) => state.layoutReducer.floorplanId);
    const memoizedFloorIds = useMemo(() => floorIds, [floorIds]);
    const screenSettingsState = useSelector((state: AppState) => state.layoutReducer.screenSettings);
    const wholeState = useSelector((state: AppState) => state.layoutReducer);
  useEffect(() => {
    // Dispatch actions when the component is mounted
    dispatch(toggleHorizontal(false)); // Enable horizontal layout
    dispatch(toggleSidebar()); // Disable sidebar
    console.log("Screen Settings: ", screenSettingsState);
    console.log("Floor IDs: ", floorIds);
    console.log("Whole State: ", wholeState);
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
          screenSettings={screenSettings}
        />
        {/* <ConfigPreview
          selectedGrid={parseInt(selectedGrid)}
          selectedScreen={parseInt(selectedScreen)}
          setSelectedScreen={setSelectedScreen}
        /> */}
        <ConfigGrid
          grid={parseInt(selectedGrid)}
          floorIds={memoizedFloorIds}
          selectedScreen={parseInt(selectedScreen)}
          setSelectedScreen={setSelectedScreen}
          screenSettings={screenSettingsState}
          setScreenSettings={setScreenSettings}
        />
      </PageContainer>
    </>
  );
};

export default Config;
