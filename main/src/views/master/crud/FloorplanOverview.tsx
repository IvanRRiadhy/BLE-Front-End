import { useEffect, useState, useCallback, useRef } from 'react';
import { RootState, useSelector } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import { Box } from '@mui/material';
import FloorplanOverviewSidebar from 'src/components/master/CRUD/floorplan/FloorplanOverview/FloorplanOverviewSidebar/FloorplanOverviewSidebar';
import FloorplanOverviewView from 'src/components/master/CRUD/floorplan/FloorplanOverview/FloorplanOverviewContent/FloorplanOverviewView';

import { SectionKey, VisibilityState } from './FloorplanOverviewTypes';

const FloorplanOverview = () => {
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );

  const viewRef = useRef<any>(null);

  const [visibility, setVisibility] = useState<Record<SectionKey, VisibilityState>>({
    areas: { accordionHidden: false, items: {} },
    patrol: { accordionHidden: false, items: {} },
    devices: { accordionHidden: false, items: {} },
    geofence: { accordionHidden: false, items: {} },
    stay: { accordionHidden: false, items: {} },
    over: { accordionHidden: false, items: {} },
    boundary: { accordionHidden: false, items: {} },
  });

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const isVisible = useCallback((section: SectionKey, id: string) => {
    const s = visibility[section];
    if (s.items[id] !== undefined) return s.items[id];
    return !s.accordionHidden;
  }, [visibility]);

  const toggleSectionHide = useCallback((section: SectionKey) => {
    setVisibility((prev) => {
      const nextHidden = !prev[section].accordionHidden;
      return {
        ...prev,
        [section]: {
          accordionHidden: nextHidden,
          items: {}, // Reset all overrides
        },
      };
    });
  }, []);

  const toggleItem = useCallback((section: SectionKey, id: string, list: any[]) => {
    setVisibility((prev) => {
      const sectionState = prev[section];
      const currentVisible = isVisible(section, id);

      const newItems = {
        ...sectionState.items,
        [id]: !currentVisible,
      };

      // Check if ALL items are visible or ALL items are hidden
      const allVisible = list.every((item) => {
        if (newItems[item.id] !== undefined) return newItems[item.id];
        return !sectionState.accordionHidden;
      });
      const allHidden = list.every((item) => {
        if (newItems[item.id] !== undefined) return !newItems[item.id];
        return sectionState.accordionHidden;
      });

      return {
        ...prev,
        [section]: {
          accordionHidden: allVisible ? false : allHidden ? true : sectionState.accordionHidden,
          items: newItems,
        },
      };
    });
  }, [isVisible]);

  const handleExport = useCallback((type: 'pdf' | 'png') => {
    if (viewRef.current) {
      viewRef.current.exportCanvas(type);
    }
  }, []);

  if (!selectedFloorplan) {
    window.location.href = '/master/floorplan/';
    return null;
  }

  return (
    <PageContainer title="People Tracking System" description="People Tracking System">
      <AppCard>
        <Box
          display="flex"
          flexDirection="column"
          height={'90vh'}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <FloorplanOverviewSidebar 
            visibility={visibility}
            toggleSectionHide={toggleSectionHide}
            toggleItem={toggleItem}
            isVisible={isVisible}
            onExport={handleExport}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
        </Box>

        <Box flexGrow={1}>
          <FloorplanOverviewView 
            ref={viewRef}
            zoomable 
            visibility={visibility}
            toggleSectionHide={toggleSectionHide}
            isVisible={isVisible}
            selectedItem={selectedItem}
          />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default FloorplanOverview;
