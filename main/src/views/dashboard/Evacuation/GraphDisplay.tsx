import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  MenuItem,
  Select,
  Stack,
  Grid2 as Grid,
  Divider,
  FormControl,
  IconButton,
  Tooltip,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  IconChartPie,
  IconMapPin,
  IconUsers,
  IconFlag,
  IconHome,
  IconClock,
  IconBuildingHospital,
  IconX,
} from '@tabler/icons-react';
import { useSelector } from 'src/store/Store';
import { EvacuationPerson } from 'src/store/apps/tracking/Evacuation';

interface HierarchicalFilterProps {
  building: string;
  floor: string;
  floorplan: string;
  area: string;
  buildings: string[];
  floors: string[];
  floorplans: string[];
  areas: string[];
  onBuildingChange: (val: string) => void;
  onFloorChange: (val: string) => void;
  onFloorplanChange: (val: string) => void;
  onAreaChange: (val: string) => void;
  onReset: () => void;
}

const LocationHierarchyFilter: React.FC<HierarchicalFilterProps> = ({
  building,
  floor,
  floorplan,
  area,
  buildings,
  floors,
  floorplans,
  areas,
  onBuildingChange,
  onFloorChange,
  onFloorplanChange,
  onAreaChange,
  onReset,
}) => {
  const isFiltered = building !== 'all' || floor !== 'all' || floorplan !== 'all' || area !== 'all';

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
      {/* Building Filter */}
      <FormControl size="small">
        <Select
          value={building}
          onChange={(e) => onBuildingChange(e.target.value)}
          displayEmpty
          renderValue={(val) => (val === 'all' ? 'Building' : `Building: ${val}`)}
          sx={{
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            height: 34,
            bgcolor: building !== 'all' ? '#E8F2FE' : '#F8FAFC',
            color: building !== 'all' ? '#1877F2' : '#475569',
            border: '1px solid',
            borderColor: building !== 'all' ? '#1877F2' : '#CBD5E1',
            '& .MuiSelect-select': { py: 0.5, px: 1.5 },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: '13px', fontWeight: 600 }}>All Buildings</MenuItem>
          {buildings.map((b) => (
            <MenuItem key={b} value={b} sx={{ fontSize: '13px' }}>{b}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Floor Filter */}
      <FormControl size="small">
        <Select
          value={floor}
          onChange={(e) => onFloorChange(e.target.value)}
          displayEmpty
          renderValue={(val) => (val === 'all' ? 'Floor' : `Floor: ${val}`)}
          disabled={floors.length === 0 && building === 'all'}
          sx={{
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            height: 34,
            bgcolor: floor !== 'all' ? '#E8F2FE' : '#F8FAFC',
            color: floor !== 'all' ? '#1877F2' : '#475569',
            border: '1px solid',
            borderColor: floor !== 'all' ? '#1877F2' : '#CBD5E1',
            '& .MuiSelect-select': { py: 0.5, px: 1.5 },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: '13px', fontWeight: 600 }}>All Floors</MenuItem>
          {floors.map((f) => (
            <MenuItem key={f} value={f} sx={{ fontSize: '13px' }}>{f}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Floorplan Filter */}
      <FormControl size="small">
        <Select
          value={floorplan}
          onChange={(e) => onFloorplanChange(e.target.value)}
          displayEmpty
          renderValue={(val) => (val === 'all' ? 'Floorplan' : `Floorplan: ${val}`)}
          disabled={floorplans.length === 0 && floor === 'all'}
          sx={{
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            height: 34,
            bgcolor: floorplan !== 'all' ? '#E8F2FE' : '#F8FAFC',
            color: floorplan !== 'all' ? '#1877F2' : '#475569',
            border: '1px solid',
            borderColor: floorplan !== 'all' ? '#1877F2' : '#CBD5E1',
            '& .MuiSelect-select': { py: 0.5, px: 1.5 },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: '13px', fontWeight: 600 }}>All Floorplans</MenuItem>
          {floorplans.map((fp) => (
            <MenuItem key={fp} value={fp} sx={{ fontSize: '13px' }}>{fp}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Area Filter */}
      <FormControl size="small">
        <Select
          value={area}
          onChange={(e) => onAreaChange(e.target.value)}
          displayEmpty
          renderValue={(val) => (val === 'all' ? 'Area' : `Area: ${val}`)}
          disabled={areas.length === 0 && floorplan === 'all'}
          sx={{
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            height: 34,
            bgcolor: area !== 'all' ? '#E8F2FE' : '#F8FAFC',
            color: area !== 'all' ? '#1877F2' : '#475569',
            border: '1px solid',
            borderColor: area !== 'all' ? '#1877F2' : '#CBD5E1',
            '& .MuiSelect-select': { py: 0.5, px: 1.5 },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: '13px', fontWeight: 600 }}>All Areas</MenuItem>
          {areas.map((a) => (
            <MenuItem key={a} value={a} sx={{ fontSize: '13px' }}>{a}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Reset Filter Button */}
      {isFiltered && (
        <Tooltip title="Reset Filters">
          <IconButton
            size="small"
            onClick={onReset}
            sx={{
              width: 30,
              height: 30,
              bgcolor: '#F1F5F9',
              color: '#64748B',
              '&:hover': { bgcolor: '#FFEBEE', color: '#D32F2F' },
            }}
          >
            <IconX size={16} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

const GraphDisplay: React.FC = () => {
  const { data } = useSelector((state) => state.evacuationReducer);
  const summary = data?.summary;
  const persons: EvacuationPerson[] = data?.persons || [];

  // Filter states for Section 1 (Overview)
  const [overviewBuilding, setOverviewBuilding] = useState<string>('all');
  const [overviewFloor, setOverviewFloor] = useState<string>('all');
  const [overviewFloorplan, setOverviewFloorplan] = useState<string>('all');
  const [overviewArea, setOverviewArea] = useState<string>('all');

  // Filter states for Section 3 (Remaining by Area)
  const [remainingBuilding, setRemainingBuilding] = useState<string>('all');
  const [remainingFloor, setRemainingFloor] = useState<string>('all');
  const [remainingFloorplan, setRemainingFloorplan] = useState<string>('all');
  const [remainingArea, setRemainingArea] = useState<string>('all');

  // Overview Reset Handlers (Cascading lower level resets)
  const handleOverviewBuildingChange = (val: string) => {
    setOverviewBuilding(val);
    setOverviewFloor('all');
    setOverviewFloorplan('all');
    setOverviewArea('all');
  };

  const handleOverviewFloorChange = (val: string) => {
    setOverviewFloor(val);
    setOverviewFloorplan('all');
    setOverviewArea('all');
  };

  const handleOverviewFloorplanChange = (val: string) => {
    setOverviewFloorplan(val);
    setOverviewArea('all');
  };

  const handleOverviewAreaChange = (val: string) => {
    setOverviewArea(val);
  };

  const handleOverviewReset = () => {
    setOverviewBuilding('all');
    setOverviewFloor('all');
    setOverviewFloorplan('all');
    setOverviewArea('all');
  };

  // Remaining Reset Handlers (Cascading lower level resets)
  const handleRemainingBuildingChange = (val: string) => {
    setRemainingBuilding(val);
    setRemainingFloor('all');
    setRemainingFloorplan('all');
    setRemainingArea('all');
  };

  const handleRemainingFloorChange = (val: string) => {
    setRemainingFloor(val);
    setRemainingFloorplan('all');
    setRemainingArea('all');
  };

  const handleRemainingFloorplanChange = (val: string) => {
    setRemainingFloorplan(val);
    setRemainingArea('all');
  };

  const handleRemainingAreaChange = (val: string) => {
    setRemainingArea(val);
  };

  const handleRemainingReset = () => {
    setRemainingBuilding('all');
    setRemainingFloor('all');
    setRemainingFloorplan('all');
    setRemainingArea('all');
  };

  // Dynamic Options for Overview Filters (Hierarchical Cascading)
  const overviewBuildings = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (p.position?.buildingName) set.add(p.position.buildingName);
    });
    return Array.from(set);
  }, [persons]);

  const overviewFloors = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (overviewBuilding !== 'all' && p.position?.buildingName !== overviewBuilding) return;
      if (p.position?.floorName) set.add(p.position.floorName);
    });
    return Array.from(set);
  }, [persons, overviewBuilding]);

  const overviewFloorplans = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (overviewBuilding !== 'all' && p.position?.buildingName !== overviewBuilding) return;
      if (overviewFloor !== 'all' && p.position?.floorName !== overviewFloor) return;
      if (p.position?.floorplanName) set.add(p.position.floorplanName);
    });
    return Array.from(set);
  }, [persons, overviewBuilding, overviewFloor]);

  const overviewAreas = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (overviewBuilding !== 'all' && p.position?.buildingName !== overviewBuilding) return;
      if (overviewFloor !== 'all' && p.position?.floorName !== overviewFloor) return;
      if (overviewFloorplan !== 'all' && p.position?.floorplanName !== overviewFloorplan) return;
      if (p.position?.areaName) set.add(p.position.areaName);
    });
    return Array.from(set);
  }, [persons, overviewBuilding, overviewFloor, overviewFloorplan]);

  // Dynamic Options for Remaining Filters (Hierarchical Cascading)
  const remainingBuildings = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (p.position?.buildingName) set.add(p.position.buildingName);
    });
    return Array.from(set);
  }, [persons]);

  const remainingFloors = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (remainingBuilding !== 'all' && p.position?.buildingName !== remainingBuilding) return;
      if (p.position?.floorName) set.add(p.position.floorName);
    });
    return Array.from(set);
  }, [persons, remainingBuilding]);

  const remainingFloorplans = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (remainingBuilding !== 'all' && p.position?.buildingName !== remainingBuilding) return;
      if (remainingFloor !== 'all' && p.position?.floorName !== remainingFloor) return;
      if (p.position?.floorplanName) set.add(p.position.floorplanName);
    });
    return Array.from(set);
  }, [persons, remainingBuilding, remainingFloor]);

  const remainingAreas = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (remainingBuilding !== 'all' && p.position?.buildingName !== remainingBuilding) return;
      if (remainingFloor !== 'all' && p.position?.floorName !== remainingFloor) return;
      if (remainingFloorplan !== 'all' && p.position?.floorplanName !== remainingFloorplan) return;
      if (p.position?.areaName) set.add(p.position.areaName);
    });
    return Array.from(set);
  }, [persons, remainingBuilding, remainingFloor, remainingFloorplan]);

  // Section 1: Overview Calculations
  const filteredOverviewPersons = useMemo(() => {
    return persons.filter((p) => {
      if (overviewBuilding !== 'all' && p.position?.buildingName !== overviewBuilding) return false;
      if (overviewFloor !== 'all' && p.position?.floorName !== overviewFloor) return false;
      if (overviewFloorplan !== 'all' && p.position?.floorplanName !== overviewFloorplan) return false;
      if (overviewArea !== 'all' && p.position?.areaName !== overviewArea) return false;
      return true;
    });
  }, [persons, overviewBuilding, overviewFloor, overviewFloorplan, overviewArea]);

  const isOverviewFiltered = overviewBuilding !== 'all' || overviewFloor !== 'all' || overviewFloorplan !== 'all' || overviewArea !== 'all';

  const totalCount = useMemo(() => {
    if (!isOverviewFiltered && summary?.totalRequired !== undefined) {
      return summary.totalRequired;
    }
    return filteredOverviewPersons.length;
  }, [summary, filteredOverviewPersons, isOverviewFiltered]);

  const evacuatedCount = useMemo(() => {
    if (!isOverviewFiltered && summary?.totalEvacuated !== undefined) {
      return summary.totalEvacuated;
    }
    return filteredOverviewPersons.filter(
      (p) => p.personStatus?.toLowerCase() === 'evacuated' || Boolean(p.statusTimestamps?.evacuationAt)
    ).length;
  }, [summary, filteredOverviewPersons, isOverviewFiltered]);

  const confirmedCount = useMemo(() => {
    if (!isOverviewFiltered && summary?.totalConfirmed !== undefined) {
      return summary.totalConfirmed;
    }
    return filteredOverviewPersons.filter(
      (p) => p.personStatus?.toLowerCase() === 'confirmed' || Boolean(p.statusTimestamps?.confirmedEvacuationAt)
    ).length;
  }, [summary, filteredOverviewPersons, isOverviewFiltered]);

  const remainingCount = useMemo(() => {
    if (!isOverviewFiltered && summary?.totalRemaining !== undefined) {
      return summary.totalRemaining;
    }
    return Math.max(0, totalCount - evacuatedCount - confirmedCount);
  }, [summary, totalCount, evacuatedCount, confirmedCount, isOverviewFiltered]);

  const calcPct = (val: number, total: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  const overviewDonutData = [
    { name: 'Evacuated', value: evacuatedCount, color: '#22C55E' },
    { name: 'Confirmed', value: confirmedCount, color: '#F59E0B' },
    { name: 'Remaining', value: remainingCount, color: '#EF4444' },
  ];

  // Section 2: Distribution Calculations (Exclusively by Assembly Point)
  const distributionData = useMemo(() => {
    const evacuatedPersons = persons.filter((p) => {
      const st = p.personStatus?.toLowerCase();
      return st === 'evacuated' || st === 'confirmed' || Boolean(p.statusTimestamps?.evacuationAt) || Boolean(p.statusTimestamps?.confirmedEvacuationAt);
    });

    const countsMap: Record<string, number> = {};

    evacuatedPersons.forEach((p) => {
      const key = p.assemblyPointName || 'Unassigned Assembly Point';
      countsMap[key] = (countsMap[key] || 0) + 1;
    });

    const totalEvac = evacuatedPersons.length || 1;
    const items = Object.entries(countsMap).map(([name, count]) => ({
      name,
      count,
      pct: calcPct(count, totalEvac),
    }));

    items.sort((a, b) => b.count - a.count);
    return items;
  }, [persons]);

  const peopleAtAssemblyPoints = evacuatedCount + confirmedCount;
  const assemblyPointsUsed = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      if (p.assemblyPointName) set.add(p.assemblyPointName);
    });
    return set.size;
  }, [persons]);

  // Section 3: Remaining by Area Calculations
  const remainingAreaList = useMemo(() => {
    const remainingPersons = persons.filter((p) => {
      const isEvac = p.personStatus?.toLowerCase() === 'evacuated' || Boolean(p.statusTimestamps?.evacuationAt);
      const isConf = p.personStatus?.toLowerCase() === 'confirmed' || Boolean(p.statusTimestamps?.confirmedEvacuationAt);
      if (isEvac || isConf) return false;

      if (remainingBuilding !== 'all' && p.position?.buildingName !== remainingBuilding) return false;
      if (remainingFloor !== 'all' && p.position?.floorName !== remainingFloor) return false;
      if (remainingFloorplan !== 'all' && p.position?.floorplanName !== remainingFloorplan) return false;
      if (remainingArea !== 'all' && p.position?.areaName !== remainingArea) return false;

      return true;
    });

    const areaMap: Record<string, number> = {};
    remainingPersons.forEach((p) => {
      const areaName = p.position?.areaName || 'General Area';
      areaMap[areaName] = (areaMap[areaName] || 0) + 1;
    });

    const items = Object.entries(areaMap).map(([name, count]) => ({ name, count }));
    items.sort((a, b) => b.count - a.count);
    return items;
  }, [persons, remainingBuilding, remainingFloor, remainingFloorplan, remainingArea]);

  const totalRemainingInArea = remainingAreaList.reduce((sum, item) => sum + item.count, 0) || remainingCount;
  const remainingAreaCount = remainingAreaList.length || (remainingCount > 0 ? 1 : 0);
  const maxRemainingInBar = useMemo(() => {
    return Math.max(...remainingAreaList.map((i) => i.count), 1);
  }, [remainingAreaList]);

  const maxDistInBar = useMemo(() => {
    return Math.max(...distributionData.map((i) => i.count), 1);
  }, [distributionData]);

  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        p: 3,
        borderRadius: '24px',
        bgcolor: '#FFFFFF',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E2E8F0',
        overflowY: 'auto',
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack spacing={4}>
          {/* SECTION 1: EVACUATION OVERVIEW */}
          <Box>
            {/* Header & Hierarchical Filter Selects */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: '#FEE2E2',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconChartPie size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#0F172A">
                    Evacuation Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total people and their current evacuation status
                  </Typography>
                </Box>
              </Stack>

              {/* Hierarchical Filters */}
              <LocationHierarchyFilter
                building={overviewBuilding}
                floor={overviewFloor}
                floorplan={overviewFloorplan}
                area={overviewArea}
                buildings={overviewBuildings}
                floors={overviewFloors}
                floorplans={overviewFloorplans}
                areas={overviewAreas}
                onBuildingChange={handleOverviewBuildingChange}
                onFloorChange={handleOverviewFloorChange}
                onFloorplanChange={handleOverviewFloorplanChange}
                onAreaChange={handleOverviewAreaChange}
                onReset={handleOverviewReset}
              />
            </Stack>

            {/* Donut Chart & Legend Row */}
            <Grid container spacing={3} alignItems="center">
              {/* Donut Chart */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ position: 'relative', width: '100%', height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overviewDonutData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                      >
                        {overviewDonutData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Donut Center Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="h3" fontWeight={800} color="#0F172A" sx={{ lineHeight: 1 }}>
                      {totalCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} mt={0.5} display="block">
                      Total People
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Status List Breakdown */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={2.5}>
                  {/* Evacuated */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #F1F5F9', bgcolor: '#F8FAFC' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#22C55E', flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body1" fontWeight={700} color="#0F172A">
                          Evacuated
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reached assembly point
                        </Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight={800} color="#0F172A">
                        {evacuatedCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {calcPct(evacuatedCount, totalCount)}%
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Confirmed */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #F1F5F9', bgcolor: '#F8FAFC' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#F59E0B', flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body1" fontWeight={700} color="#0F172A">
                          Confirmed
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Manually confirmed
                        </Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight={800} color="#0F172A">
                        {confirmedCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {calcPct(confirmedCount, totalCount)}%
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Remaining */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #F1F5F9', bgcolor: '#F8FAFC' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body1" fontWeight={700} color="#0F172A">
                          Remaining
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Still inside the building
                        </Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight={800} color="#0F172A">
                        {remainingCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {calcPct(remainingCount, totalCount)}%
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          {/* SECTION 2: PEOPLE BY ASSEMBLY POINT */}
          <Box>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconMapPin size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#0F172A">
                    People by Assembly Point
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distribution of evacuated people across assembly points
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            {/* Distribution Horizontal Bars */}
            <Stack spacing={2} mb={3}>
              {distributionData.map((item, idx) => (
                <Stack key={idx} direction="row" alignItems="center" spacing={2}>
                  <Typography variant="body2" fontWeight={700} color="#0F172A" sx={{ minWidth: 180, flexShrink: 0 }}>
                    {item.name}
                  </Typography>

                  <Box sx={{ flexGrow: 1, bgcolor: '#F1F5F9', borderRadius: '8px', height: 28, p: 0.5, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        borderRadius: '6px',
                        bgcolor: idx === 0 ? '#1877F2' : idx === 1 ? '#3B82F6' : idx === 2 ? '#60A5FA' : '#93C5FD',
                        width: `${Math.max(5, (item.count / maxDistInBar) * 100)}%`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </Box>

                  <Typography variant="body1" fontWeight={800} color="#0F172A" sx={{ minWidth: 24, textAlign: 'right' }}>
                    {item.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}>
                    {item.pct}%
                  </Typography>
                </Stack>
              ))}
            </Stack>

            {/* KPI Summary Cards */}
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9', p: 2.5 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        bgcolor: '#E0F2FE',
                        color: '#0284C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconUsers size={24} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={800} color="#0F172A">
                        {peopleAtAssemblyPoints}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        People at Assembly Points (Evacuated + Confirmed)
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        bgcolor: '#FEE2E2',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconFlag size={24} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={800} color="#0F172A">
                        {assemblyPointsUsed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Assembly Points Used out of total available
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          {/* SECTION 3: PEOPLE REMAINING BY AREA */}
          <Box>
            {/* Header & Hierarchical Filter Selects */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: '#F3E8FF',
                    color: '#9333EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconBuildingHospital size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#0F172A">
                    People Remaining by Area
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Number of people still inside per current location area
                  </Typography>
                </Box>
              </Stack>

              {/* Hierarchical Filters */}
              <LocationHierarchyFilter
                building={remainingBuilding}
                floor={remainingFloor}
                floorplan={remainingFloorplan}
                area={remainingArea}
                buildings={remainingBuildings}
                floors={remainingFloors}
                floorplans={remainingFloorplans}
                areas={remainingAreas}
                onBuildingChange={handleRemainingBuildingChange}
                onFloorChange={handleRemainingFloorChange}
                onFloorplanChange={handleRemainingFloorplanChange}
                onAreaChange={handleRemainingAreaChange}
                onReset={handleRemainingReset}
              />
            </Stack>

            {/* Bars & Highlight Box Grid */}
            <Grid container spacing={3} alignItems="flex-start">
              {/* Left Column: Horizontal Red Bars */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={2}>
                  {remainingAreaList.map((item, idx) => (
                    <Stack key={idx} direction="row" alignItems="center" spacing={2}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A" sx={{ minWidth: 180, flexShrink: 0 }}>
                        {item.name}
                      </Typography>

                      <Box sx={{ flexGrow: 1, bgcolor: '#F1F5F9', borderRadius: '8px', height: 28, p: 0.5, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            borderRadius: '6px',
                            bgcolor: idx === 0 ? '#DC2626' : idx < 3 ? '#EF4444' : '#F87171',
                            width: `${Math.max(5, (item.count / maxRemainingInBar) * 100)}%`,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </Box>

                      <Typography variant="body1" fontWeight={800} color="#0F172A" sx={{ minWidth: 24, textAlign: 'right' }}>
                        {item.count}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>

              {/* Right Column: Highlight Card & Info Footnote */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      bgcolor: '#FEF2F2',
                      border: '1px solid #FEE2E2',
                      borderRadius: '20px',
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: '#FFFFFF',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
                      }}
                    >
                      <IconHome size={28} />
                    </Box>

                    <Typography variant="h2" fontWeight={800} color="#0F172A" sx={{ lineHeight: 1 }}>
                      {totalRemainingInArea}
                    </Typography>

                    <Typography variant="h6" fontWeight={800} color="#0F172A" mt={1}>
                      People Remaining
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      across {remainingAreaCount} area(s)
                    </Typography>
                  </Box>

                  {/* Footnote */}
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ px: 0.5 }}>
                    <IconClock size={18} color="#64748B" style={{ marginTop: 2, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      Areas are based on the current detected position of people who have not yet evacuated.
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default GraphDisplay;
