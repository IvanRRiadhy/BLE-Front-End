import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import ConfigSidebar from 'src/components/dashboards/monitoring/config/ConfigSidebar';
import ConfigGrid from 'src/components/dashboards/monitoring/config/ConfigGrid';
import { useEffect, useState, useMemo } from 'react';
import { toggleHorizontal, toggleSidebar } from 'src/store/customizer/CustomizerSlice';
import { Box, Grid2 as Grid } from '@mui/material';
import { setSelectedFloorplan, setSelectedScreen } from 'src/store/apps/monitoring/layout';

const Config = () => {
  const dispatch = useDispatch();

  // --- Local preview state ---
  const [previewGrid, setPreviewGrid] = useState(1);
  const [previewScreens, setPreviewScreens] = useState<
    { type: number; floorplanId?: string; displayOutput?: string }[]
  >([]);
  const selectedScreen = useSelector((state: RootState) => state.layoutReducer.selectedScreen);
  const selectedFloorplanId = useSelector(
    (state: RootState) => state.layoutReducer.selectedFloorplanId,
  );

  // const [screenSettings, setScreenSettings] = useState({
  //   scale: 1,
  //   translateX: 0,
  //   translateY: 0,
  // });

  // --- Redux data ---
  const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const activeLayout = layouts.find((l) => l.id === activeLayoutId);

  const selectedScreenSettings =
    selectedScreen !== null && activeLayout
      ? activeLayout.screens[selectedScreen]?.settings ?? { scale: 1, translateX: 0, translateY: 0 }
      : { scale: 1, translateX: 0, translateY: 0 };

  // --- Lifecycle setup (hide sidebar, switch layout) ---
  useEffect(() => {
    dispatch(toggleHorizontal(false)); // horizontal off
    dispatch(toggleSidebar()); // hide sidebar
    return () => {
      dispatch(toggleHorizontal(true)); // restore on cleanup
      dispatch(toggleSidebar()); // restore sidebar
    };
  }, [dispatch]);

  // --- Handle manual sidebar updates ---
  const handleGridChange = (grid: number) => {
    setPreviewGrid(grid);
    setPreviewScreens((prev) => {
      const next = [...prev];
      next.length = grid;
      return next.map((s) => s || { type: 0 });
    });
  };

  const handleScreenUpdate = (
    index: number,
    preview: { type: number; floorplanId?: string; displayOutput?: string },
  ) => {
    setPreviewScreens((prev) => {
      const next = [...prev];
      next[index] = preview;
      return next;
    });
  };

  const SetSelectedScreen = (index: number | null, floorplanId?: string) => {
    dispatch(setSelectedScreen(index));
    dispatch(setSelectedFloorplan(floorplanId || null));
    console.log(index, floorplanId);
    console.log(layouts, activeLayoutId);
  };

  // const setSelectedFloorplanId = (id: string | null) => {
  //   dispatch(setSelectedFloorplan(id));
  // };

  // --- 🔄 Auto-update preview when layout or grid changes ---
  useEffect(() => {
    if (!activeLayout) return;

    const newScreens = activeLayout.screens.map((screen) => ({
      type: screen.display?.displayType ?? 0,
      floorplanId: screen.floorplanId ?? '',
      displayOutput: screen.display?.displayOutput ?? '',
    }));

    // layout type stays fixed (grid stays 7)
    setPreviewGrid(activeLayout.grid);

    // screens dynamically expand
    setPreviewScreens(newScreens);
  }, [activeLayout]);

  // --- Memoized screen data for ConfigGrid ---z
  const memoizedScreens = useMemo(() => previewScreens, [previewScreens]);

  return (
    <PageContainer title="Monitoring Config" description="Monitoring Config">
      <Box sx={{ flexGrow: 1, mt: 2 }}>
        <Grid container spacing={2}>
          {/* Sidebar on the left */}
          <Grid size={{ xs: 12, md: 4, lg: 2 }}>
            <ConfigSidebar
              onGridChange={handleGridChange}
              onScreenUpdate={handleScreenUpdate}
              screenSettings={selectedScreenSettings}
              selectedScreen={selectedScreen}
              setSelectedScreen={SetSelectedScreen}
              selectedFloorplanId={selectedFloorplanId}
            />
          </Grid>

          {/* Grid preview area on the right */}
          <Grid size={{ xs: 12, md: 8, lg: 10 }}>
            <ConfigGrid
              grid={previewGrid}
              screens={memoizedScreens}
              screenSettings={
                activeLayout
                  ? activeLayout.screens.map(
                      (s) => s?.settings ?? { scale: 1, translateX: 0, translateY: 0 },
                    )
                  : []
              }
              selectedScreen={selectedScreen}
              onScreenSelect={SetSelectedScreen}
              activeLayout={activeLayout}
            />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Config;
