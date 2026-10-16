import { Box, Grid2 as Grid, Typography, useTheme, Paper, Tooltip, Menu, MenuItem } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
import { LayoutItem, ScreenSettings, gridLayoutConfig } from 'src/store/apps/monitoring/layout';
import ScrollArrowButton from 'src/components/shared/ScrollArrowButton'; // Add this import
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllBuilding } from 'src/hooks/useBuilding';

interface MonitoringGridProps {
  grid: number;
  screenId: Record<number, string[]>;
  floorIds: Record<number, string[]>;
  screenSettings: ScreenSettings[][];
  screenDisplay: Record<number, any[]>;
  screenType: Record<number, number[]>;
}

// Create a ScrollableRow component for MonitoringGrid
const ScrollableRowWithArrows: React.FC<{
  children: React.ReactNode;
  itemHeight?: string;
}> = ({ children, itemHeight = '20vh' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);

    const el = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (el) {
      observer = new ResizeObserver(() => {
        checkScrollPosition();
      });
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', checkScrollPosition);
      if (observer && el) observer.unobserve(el);
    };
  }, []);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ScrollArrowButton direction="left" onClick={scrollLeft} visible={showLeftArrow} />

      <ScrollArrowButton direction="right" onClick={scrollRight} visible={showRightArrow} />

      <Box
        ref={containerRef}
        onScroll={checkScrollPosition}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: 1.5,
          // p: 1,
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          height: itemHeight,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// Component to render the isometric floor stack icon matching the number of floors in the building
const FloorStackIndicator: React.FC<{
  buildingFloors: { id: string; name: string; level: number }[];
  currentFloorLevel?: number;
  currentFloorId?: string;
  buildingName?: string;
  currentFloorName?: string;
  floorplans?: any[];
  onSelectFloorplan?: (floorplanId: string) => void;
}> = ({
  buildingFloors,
  currentFloorLevel,
  currentFloorId,
  buildingName,
  currentFloorName,
  floorplans = [],
  onSelectFloorplan,
}) => {
  const theme = useTheme();

  // Anchor and menu state for floorplans selection popup
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFloorForMenu, setSelectedFloorForMenu] = useState<{
    id: string;
    name: string;
    level: number;
    floorplans: any[];
  } | null>(null);

  // If no building floors, fallback to a 3-layer stack representation
  const floorsList =
    buildingFloors && buildingFloors.length > 0
      ? buildingFloors
      : [
          { id: '1', name: 'Floor 1', level: 1 },
          { id: '2', name: 'Floor 2', level: 2 },
          { id: '3', name: 'Floor 3', level: 3 },
        ];

  // Stack is displayed from top floor to bottom floor
  // Highest level at the top, lowest level at the bottom
  const reversedFloors = [...floorsList].sort((a, b) => b.level - a.level);
  const totalLayers = reversedFloors.length;

  const layerHeight = 12;
  const gap = 5;
  const svgWidth = 56;
  const svgHeight = 24 + (totalLayers - 1) * (layerHeight + gap);

  const isDarkMode = theme.palette.mode === 'dark';

  // Hovered layer tracking for extra interactivity
  const [hoveredFloorId, setHoveredFloorId] = useState<string | null>(null);

  const handleLayerClick = (
    event: React.MouseEvent<SVGGElement>,
    fl: { id: string; name: string; level: number },
    matchingFloorplans: any[],
  ) => {
    event.stopPropagation();
    if (!onSelectFloorplan) return;

    if (matchingFloorplans.length === 0) {
      return; // Can't be clicked
    }

    if (matchingFloorplans.length === 1) {
      onSelectFloorplan(matchingFloorplans[0].id);
    } else {
      // More than 1 floorplan: open selection menu
      setSelectedFloorForMenu({
        ...fl,
        floorplans: matchingFloorplans,
      });
      setMenuAnchor(event.currentTarget as unknown as HTMLElement);
    }
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedFloorForMenu(null);
  };

  const handleFloorplanSelect = (floorplanId: string) => {
    if (onSelectFloorplan) {
      onSelectFloorplan(floorplanId);
    }
    handleCloseMenu();
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          pointerEvents: 'auto',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)'}`,
          borderRadius: '12px',
          p: 1.25,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxHeight: '65%',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          userSelect: 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {reversedFloors.map((fl, idx) => {
            const yOffset = idx * (layerHeight + gap);
            const isCurrent =
              (currentFloorId && fl.id && fl.id.toUpperCase() === currentFloorId.toUpperCase()) ||
              fl.level === currentFloorLevel;
            const isHovered = hoveredFloorId === fl.id;

            // Find all floorplans that belong to this floor (case-insensitive comparison)
            const matchingFloorplans = floorplans.filter((fp) => {
              const fpFloorId = fp.floorId || fp.floor?.id;
              return fpFloorId && fl.id && fpFloorId.toUpperCase() === fl.id.toUpperCase();
            });
            const hasFloorplan = matchingFloorplans.length > 0;

            // Tooltip title text formatted per requirement
            let tooltipText = '';
            if (!hasFloorplan) {
              tooltipText = `No detected Floorplan for this Floor (${fl.name})`;
            } else if (matchingFloorplans.length === 1) {
              tooltipText = `Change view to "${fl.name}" "${matchingFloorplans[0].name}"`;
            } else {
              tooltipText = `Change view to "${fl.name}" (${matchingFloorplans.length} Floorplans available)`;
            }

            // Diamond points
            const topPt = '28,' + (2 + yOffset);
            const rightPt = '52,' + (11 + yOffset);
            const bottomPt = '28,' + (20 + yOffset);
            const leftPt = '4,' + (11 + yOffset);

            const diamondPoints = `${topPt} ${rightPt} ${bottomPt} ${leftPt}`;

            // Left extruded face: (4, 11+y), (28, 20+y), (28, 20+y+depth), (4, 11+y+depth)
            const leftFace = `4,${11 + yOffset} 28,${20 + yOffset} 28,${20 + yOffset + 3} 4,${11 + yOffset + 3}`;
            // Right extruded face: (28, 20+y), (52, 11+y), (52, 11+y+depth), (28, 20+y+depth)
            const rightFace = `28,${20 + yOffset} 52,${11 + yOffset} 52,${11 + yOffset + 3} 28,${20 + yOffset + 3}`;

            // Highlight colors
            const topFill = isCurrent
              ? theme.palette.primary.main
              : isHovered && hasFloorplan
              ? theme.palette.primary.dark
              : !hasFloorplan
              ? isDarkMode
                ? '#1e2530'
                : '#94a3b8'
              : isDarkMode
              ? '#384252'
              : '#1e293b';

            const leftFill = isCurrent
              ? theme.palette.primary.dark
              : isHovered && hasFloorplan
              ? theme.palette.primary.dark
              : !hasFloorplan
              ? isDarkMode
                ? '#0f141c'
                : '#64748b'
              : isDarkMode
              ? '#1e293b'
              : '#0f172a';

            const rightFill = isCurrent
              ? theme.palette.primary.light
              : isHovered && hasFloorplan
              ? theme.palette.primary.main
              : !hasFloorplan
              ? isDarkMode
                ? '#283344'
                : '#cbd5e1'
              : isDarkMode
              ? '#475569'
              : '#334155';

            return (
              <Tooltip key={fl.id || idx} title={tooltipText} placement="right" arrow>
                <g
                  onClick={(e) => handleLayerClick(e, fl, matchingFloorplans)}
                  onMouseEnter={() => setHoveredFloorId(fl.id)}
                  onMouseLeave={() => setHoveredFloorId(null)}
                  style={{
                    cursor: hasFloorplan ? 'pointer' : 'not-allowed',
                    opacity: !hasFloorplan ? 0.45 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* 3D thickness side faces */}
                  <polygon points={leftFace} fill={leftFill} />
                  <polygon points={rightFace} fill={rightFill} />
                  {/* Top isometric plane */}
                  <polygon
                    points={diamondPoints}
                    fill={topFill}
                    stroke={
                      isCurrent
                        ? '#ffffff'
                        : isHovered && hasFloorplan
                        ? theme.palette.primary.light
                        : !hasFloorplan
                        ? isDarkMode
                          ? '#334155'
                          : '#cbd5e1'
                        : isDarkMode
                        ? '#64748b'
                        : '#475569'
                    }
                    strokeWidth={isCurrent || isHovered ? 1.6 : 0.8}
                    style={{
                      filter:
                        isCurrent || (isHovered && hasFloorplan)
                          ? 'drop-shadow(0px 2px 4px rgba(24, 119, 242, 0.4))'
                          : 'none',
                    }}
                  />
                </g>
              </Tooltip>
            );
          })}
        </svg>

        {currentFloorLevel !== undefined && (
          <Tooltip title={`${buildingName ? buildingName + ' • ' : ''}${currentFloorName || `Level ${currentFloorLevel}`}`} placement="right" arrow>
            <Typography
              variant="caption"
              sx={{
                mt: 1,
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'primary.main',
                letterSpacing: '0.5px',
                cursor: 'default',
              }}
            >
              L{currentFloorLevel}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Floorplan Selection Menu for floors with multiple floorplans */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor && selectedFloorForMenu)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 0,
              ml: 1.5,
              borderRadius: 2,
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(10px)',
              backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {selectedFloorForMenu?.name} (Level {selectedFloorForMenu?.level})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select a floorplan to display:
          </Typography>
        </Box>
        {selectedFloorForMenu?.floorplans.map((fp) => (
          <MenuItem
            key={fp.id}
            onClick={() => handleFloorplanSelect(fp.id)}
            sx={{
              py: 1,
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'primary.light',
                color: 'primary.main',
              },
            }}
          >
            {fp.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};


const MonitoringGrid: React.FC<MonitoringGridProps> = React.memo(
  ({ grid, screenId, floorIds, screenSettings, screenDisplay, screenType }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
    const theme = useTheme();

    // Temporary override for main screen (idx === 0) floorplan (does not persist to layout)
    const [tempMainFloorplan, setTempMainFloorplan] = useState<string | null>(null);

    const originalMainFloorplan = floorIds[grid]?.[0];

    // Whenever original floorplan changes (e.g. following swap or double click swap) or grid changes, reset temporary override
    useEffect(() => {
      setTempMainFloorplan(null);
    }, [grid, originalMainFloorplan]);

    const { data: floorplans = [] } = useAllFloorplans();
    const { data: floors = [] } = useAllFloors();
    const { data: buildings = [] } = useAllBuilding();

    const floorplanInfoMap = React.useMemo(() => {
      const map = new Map<
        string,
        {
          floorplanName: string;
          floorName?: string;
          buildingName?: string;
          buildingId?: string;
          floorId?: string;
          floorLevel?: number;
          buildingFloors: { id: string; name: string; level: number }[];
        }
      >();

      const buildingMap = new Map<string, string>();
      buildings.forEach((b) => {
        if (b.id) buildingMap.set(b.id, b.name);
      });

      const floorMap = new Map<string, { id: string; name: string; buildingId?: string; level?: number }>();
      floors.forEach((f) => {
        if (f.id) {
          // Parse level: if number is defined use it, otherwise attempt extracting integer from name (e.g. "Lantai 1" -> 1)
          let parsedLevel: number | undefined = undefined;
          if (typeof (f as any).level === 'number' && !isNaN((f as any).level)) {
            parsedLevel = (f as any).level;
          } else if (typeof (f as any).level === 'string' && (f as any).level.trim() !== '') {
            const num = Number((f as any).level);
            if (!isNaN(num)) parsedLevel = num;
          }
          if (parsedLevel === undefined) {
            const match = f.name?.match(/(\d+)/);
            if (match) parsedLevel = parseInt(match[1], 10);
            else parsedLevel = 0;
          }

          floorMap.set(f.id.toUpperCase(), {
            id: f.id,
            name: f.name,
            buildingId: f.buildingId,
            level: parsedLevel,
          });
        }
      });

      floorplans.forEach((fp) => {
        if (!fp.id) return;
        const targetFloorId = fp.floorId || fp.floor?.id;
        const fl = targetFloorId ? floorMap.get(targetFloorId.toUpperCase()) : fp.floor;
        const floorId = targetFloorId || fl?.id;
        const floorName = fl?.name || fp.floor?.name;
        const bId = (fl as any)?.buildingId || (fp.floor as any)?.buildingId;
        const bldg = (fl as any)?.building || (fp.floor as any)?.building;
        const buildingName = bldg?.name || (bId ? buildingMap.get(bId) : undefined);
        
        let floorLevel = typeof (fl as any)?.level === 'number' ? (fl as any).level : undefined;
        if (floorLevel === undefined && floorName) {
          const m = floorName.match(/(\d+)/);
          if (m) floorLevel = parseInt(m[1], 10);
          else floorLevel = 0;
        } else if (floorLevel === undefined) {
          floorLevel = 0;
        }

        // Find all floors belonging to this building, sorted ascending by level
        const buildingFloors = bId
          ? floors
              .filter((f) => f.buildingId === bId)
              .map((f) => {
                const mapEntry = floorMap.get(f.id.toUpperCase());
                return {
                  id: f.id,
                  name: f.name,
                  level: mapEntry?.level ?? 0,
                };
              })
              .sort((a, b) => a.level - b.level)
          : [];

        map.set(fp.id.toUpperCase(), {
          floorplanName: fp.name,
          floorName,
          buildingName,
          buildingId: bId,
          floorId,
          floorLevel,
          buildingFloors,
        });
      });

      return map;
    }, [floorplans, floors, buildings]);

    const getFloatingLabel = (floorId?: string) => {
      if (!floorId) return null;
      const info = floorplanInfoMap.get(floorId.toUpperCase());
      if (!info) return null;

      return {
        floorplanName: info.floorplanName,
        secondary: [info.floorName, info.buildingName].filter(Boolean).join(' • '),
        info,
      };
    };

    const alarmData = useSelector((state: RootState) => state.BeaconReducer.alarmLogs);
    //Get the latest Alarm for each floorplan
    const activeAlarmFloor = React.useMemo(() => {
      if (!alarmData?.length) return [];

      const latestByFloorplan = new Map<string, any>();

      for (const alarm of alarmData) {
        const floorId = alarm.floorplanId?.toUpperCase();
        if (!floorId) continue;

        const existing = latestByFloorplan.get(floorId);

        // Compare time (assuming ISO string or Date-compatible)
        if (!existing || new Date(alarm.time).getTime() > new Date(existing.time).getTime()) {
          // console.log(alarm);
          latestByFloorplan.set(floorId, alarm);
        }
      }
      console.log('latestByFloorplan', latestByFloorplan);
      return Array.from(latestByFloorplan.values())
        .filter((a) => a.action === 'idle' || a.action === 'acknowledged')
        .map((a) => a.floorplanId.toUpperCase());
    }, [alarmData]);
    //Make it a set
    const activeAlarmFloorSet = React.useMemo(() => new Set(activeAlarmFloor), [activeAlarmFloor]);

    // Track container size
    useEffect(() => {
      if (gridRef.current) {
        const { clientWidth, clientHeight } = gridRef.current;
        setGridDimensions({ width: clientWidth, height: clientHeight });
      }
    }, [grid, floorIds[grid]?.length]);

    // No grid chosen
    if (!floorIds[grid] || floorIds[grid].length === 0) {
      return (
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h4" fontWeight={900} mt={0.5}>
              Monitoring Dashboard
            </Typography>
            <Typography variant="h6" fontWeight={900} mt={0.5}>
              Please select a Layout to Monitor
            </Typography>
          </Grid>
        </Grid>
      );
    }

    // ---------------------------------------------------------------------
    //  Helper: Render layout structure (recursively)
    // ---------------------------------------------------------------------
    const renderLayout = (items: LayoutItem[]): JSX.Element[] =>
      items.map((item, index) => {
        // ------------------------------------------
        // CASE A — Nested children (Recursive Layout)
        // ------------------------------------------
        if (item.children && !item.isScrollableRow) {
          return (
            <Grid key={index} size={item.size}>
              <Grid container direction={item.isColumn ? 'column' : 'row'} spacing={1.5}>
                {renderLayout(item.children)}
              </Grid>
            </Grid>
          );
        }

        // ------------------------------------------
        // CASE B — TYPE 7: Scrollable Mini-Screen Row
        // ------------------------------------------
        if (item.isScrollableRow) {
          const miniFloors = floorIds[grid].slice(1);
          const miniIds = screenId[grid].slice(1);
          const miniTypes = screenType[grid].slice(1);
          const miniSettings = screenSettings[grid].slice(1);
          const miniDisplays = screenDisplay[grid].slice(1);

          return (
            <Grid key={index} size={item.size}>
              <ScrollableRowWithArrows itemHeight={item.height}>
                {miniFloors.map((floorId, i) => {
                  const isMiniAlarm = !!floorId && activeAlarmFloorSet.has(floorId.toUpperCase());
                  const labelInfo = getFloatingLabel(floorId);

                  return (
                    <Paper
                      elevation={3}
                      sx={{
                        width: 260,
                        height: '100%',
                        flexShrink: 0,
                        borderRadius: 2,
                        p: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#ffffff',
                        border: '2.5px solid',
                        borderColor: isMiniAlarm ? 'error.main' : (theme.palette.mode === 'dark' ? 'grey.800' : '#a1a1a1'),

                        ...(isMiniAlarm && {
                          animation: 'alarmAura 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        }),

                        '@keyframes alarmAura': {
                          '0%': {
                            boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                          },
                          '50%': {
                            boxShadow: '0 0 18px 6px rgba(255,0,0,0.6)',
                          },
                          '100%': {
                            boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                          },
                        },

                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {labelInfo && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 10,
                            pointerEvents: 'none',
                            maxWidth: '85%',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            backgroundColor:
                              theme.palette.mode === 'dark'
                                ? 'rgba(15, 23, 42, 0.72)'
                                : 'rgba(255, 255, 255, 0.85)',
                            border: `1px solid ${
                              theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.12)'
                                : 'rgba(0, 0, 0, 0.08)'
                            }`,
                            borderRadius: '6px',
                            px: 1,
                            py: 0.25,
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                            userSelect: 'none',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              lineHeight: 1.2,
                              fontSize: '0.7rem',
                              color: 'text.primary',
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {labelInfo.floorplanName}
                          </Typography>
                          {labelInfo.secondary && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 500,
                                lineHeight: 1.1,
                                fontSize: '0.62rem',
                                color: 'text.secondary',
                                display: 'block',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {labelInfo.secondary}
                            </Typography>
                          )}
                        </Box>
                      )}

                      <FloorView
                        activeFloorplan={floorId}
                        zoomable={false}
                        containerWidth={260}
                        containerHeight={item.height ? parseInt(item.height) - 20 : 180}
                        screenSettings={miniSettings[i]}
                        activeMaskedArea={miniDisplays[i]}
                        focusBeacon={miniTypes[i] === 3 ? miniDisplays[i] : undefined}
                        gridNumber={grid}
                        screenNumber={i + 2}
                        screenId={miniIds[i]}
                      />
                    </Paper>
                  );
                })}
              </ScrollableRowWithArrows>
            </Grid>
          );
        }

        // ------------------------------------------
        // CASE C — NORMAL SCREEN ITEM (Types 1–6)
        // ------------------------------------------
        const idx = item.floorId!;
        const originalFloorplanId = floorIds[grid][idx];
        const effectiveFloorplanId =
          idx === 0 && tempMainFloorplan ? tempMainFloorplan : originalFloorplanId;

        const type = screenType[grid][idx];
        const isAlarmActive =
          !!effectiveFloorplanId && activeAlarmFloorSet?.has(effectiveFloorplanId.toUpperCase());
        const labelInfo = getFloatingLabel(effectiveFloorplanId);

        return (
          <Grid key={index} size={item.size}>
            <Paper
              elevation={3}
              sx={{
                height: item.height,
                p: 1.5,
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#ffffff',
                border: '2.5px solid',
                borderColor: isAlarmActive ? 'error.main' : (theme.palette.mode === 'dark' ? 'grey.800' : '#a1a1a1'),

                // 🔥 AURA EFFECT
                ...(isAlarmActive && {
                  animation: 'alarmAura 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }),

                // Keyframes defined inline
                '@keyframes alarmAura': {
                  '0%': {
                    boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                  },
                  '50%': {
                    boxShadow: '0 0 18px 6px rgba(255,0,0,0.6)',
                  },
                  '100%': {
                    boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                  },
                },
              }}
            >
              {labelInfo && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    pointerEvents: 'none',
                    maxWidth: '45%',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.75)'
                        : 'rgba(255, 255, 255, 0.88)',
                    border: `1px solid ${
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.08)'
                    }`,
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.6,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    userSelect: 'none',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.25,
                      color: 'text.primary',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {labelInfo.floorplanName}
                  </Typography>
                  {labelInfo.secondary && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        lineHeight: 1.2,
                        color: 'text.secondary',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {labelInfo.secondary}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Left-center Floor Level Stack Indicator (Only on Main View / interactable screen: idx === 0) */}
              {idx === 0 && labelInfo?.info && (
                <FloorStackIndicator
                  buildingFloors={labelInfo.info.buildingFloors}
                  currentFloorLevel={labelInfo.info.floorLevel}
                  currentFloorId={labelInfo.info.floorId}
                  buildingName={labelInfo.info.buildingName}
                  currentFloorName={labelInfo.info.floorName}
                  floorplans={floorplans}
                  onSelectFloorplan={(targetFpId) => {
                    setTempMainFloorplan(targetFpId);
                  }}
                />
              )}

              {type === 2 ? null : (
                <FloorView
                  activeFloorplan={effectiveFloorplanId}
                  zoomable={idx === 0}
                  containerWidth={gridDimensions.width}
                  containerHeight={gridDimensions.height}
                  screenSettings={screenSettings[grid][idx]}
                  activeMaskedArea={screenDisplay[grid][idx]}
                  focusBeacon={type === 3 ? screenDisplay[grid][idx] : undefined}
                  gridNumber={grid}
                  screenNumber={idx + 1}
                  screenId={screenId[grid][idx]}
                />
              )}
            </Paper>
          </Grid>
        );
      });

    // ---------------------------------------------------------------------
    // RENDER ROOT GRID
    // ---------------------------------------------------------------------
    const layout = gridLayoutConfig[grid] ?? [];
    return (
      <Box ref={gridRef}>
        <Grid container spacing={1.5}>
          {renderLayout(layout)}
        </Grid>
      </Box>
    );
  },
);

export default MonitoringGrid;
