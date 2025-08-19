import { useSelector } from 'react-redux';
import { RootState, useDispatch } from 'src/store/Store';
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
  const [screenSettings, setScreenSettings] = useState<{
    scale: number;
    translateX: number;
    translateY: number;
  }>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const floorIds = useSelector((state: RootState) => state.layoutReducer.floorplanId);
  const screenDisplay = useSelector((state: RootState) => state.layoutReducer.screenDisplay);
  // console.log(screenDisplay);
  const floorIds2 = screenDisplay?.map((row: any) => row.map((item: any) => item.displayOutput)) ?? [];
  const screenType = screenDisplay?.map((row: any) => row.map((item: any) => item.displayType)) ?? [];

  const memoizedFloorIds = useMemo(() => floorIds, [floorIds]);
  const memoizedFloorIds2 = useMemo(() => floorIds2, [floorIds2]);
  const memoizedScreenType = useMemo(() => screenType, [screenType]);
  const screenSettingsState = useSelector((state: RootState) => state.layoutReducer.screenSettings);
  const wholeState = useSelector((state: RootState) => state.layoutReducer);
  useEffect(() => {
    // Dispatch actions when the component is mounted
    dispatch(toggleHorizontal(false)); // Enable horizontal layout
    dispatch(toggleSidebar()); // Disable sidebar
    console.log('Screen Settings: ', screenSettingsState);
    console.log('Floor IDs: ', floorIds);
    console.log('Whole State: ', wholeState);
    console.log('Screen Display: ', floorIds2);
    console.log('Screen Type: ', screenType);
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
          screenDisplay={memoizedFloorIds2}
          screenType={memoizedScreenType}
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
