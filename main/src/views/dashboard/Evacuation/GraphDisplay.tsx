import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Grid2 as Grid,
  Divider,
  FormControl,
  InputLabel,
} from '@mui/material';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

// Dummy data as before...
const dataMap = {
  organization: [
    { id: 'org1', name: 'Org Alpha', evacuated: 42, confirmed: 10, notConfirm: 13 },
    { id: 'org2', name: 'Org Beta', evacuated: 34, confirmed: 5, notConfirm: 20 },
    { id: 'org3', name: 'Org Gamma', evacuated: 21, confirmed: 8, notConfirm: 27 },
    { id: 'org4', name: 'Org Delta', evacuated: 29, confirmed: 3, notConfirm: 0 },
    { id: 'org5', name: 'Org Epsilon', evacuated: 54, confirmed: 12, notConfirm: 8 },
  ],
  department: [
    { id: 'dep1', name: 'Dept Security', evacuated: 12, confirmed: 5, notConfirm: 0 },
    { id: 'dep2', name: 'Dept Facilities', evacuated: 7, confirmed: 2, notConfirm: 1 },
    { id: 'dep3', name: 'Dept HR', evacuated: 16, confirmed: 4, notConfirm: 9 },
    { id: 'dep4', name: 'Dept IT', evacuated: 22, confirmed: 6, notConfirm: 1 },
    { id: 'dep5', name: 'Dept Finance', evacuated: 11, confirmed: 3, notConfirm: 5 },
  ],
  district: [
    { id: 'dist1', name: 'District North', evacuated: 24, confirmed: 8, notConfirm: 0 },
    { id: 'dist2', name: 'District South', evacuated: 14, confirmed: 3, notConfirm: 13 },
    { id: 'dist3', name: 'District East', evacuated: 19, confirmed: 5, notConfirm: 0 },
    { id: 'dist4', name: 'District West', evacuated: 9, confirmed: 2, notConfirm: 17 },
    { id: 'dist5', name: 'District Central', evacuated: 28, confirmed: 7, notConfirm: 10 },
  ],
};

const dummyAreaMap = [
  {
    id: 'building1',
    name: 'Gedung Baru',
    floors: [
      {
        id: 'floor1',
        name: 'Lantai 1',
        areas: [
          { id: 'area1', name: 'Area 1', evacuated: 10, confirmed: 2, notConfirm: 3 },
          { id: 'area2', name: 'Area 2', evacuated: 8, confirmed: 4, notConfirm: 0 },
        ],
      },
      {
        id: 'floor2',
        name: 'Lantai 2',
        areas: [
          { id: 'area3', name: 'Area 3', evacuated: 12, confirmed: 4, notConfirm: 3 },
          { id: 'area4', name: 'Area 4', evacuated: 6, confirmed: 2, notConfirm: 0 },
        ],
      },
      {
        id: 'floor5',
        name: 'Lantai 3',
        areas: [{ id: 'area9', name: 'Area A', evacuated: 6, confirmed: 2, notConfirm: 7 }],
      },
    ],
  },
  {
    id: 'building2',
    name: 'Gedung Lama',
    floors: [
      {
        id: 'floor3',
        name: 'Lantai 1',
        areas: [
          { id: 'area5', name: 'Area 5', evacuated: 9, confirmed: 1, notConfirm: 2 },
          { id: 'area6', name: 'Area 6', evacuated: 7, confirmed: 0, notConfirm: 0 },
          { id: 'area7', name: 'Lobby', evacuated: 10, confirmed: 2, notConfirm: 4 },
        ],
      },
      {
        id: 'floor4',
        name: 'Lantai 2',
        areas: [
          { id: 'area7', name: 'Area 7', evacuated: 8, confirmed: 1, notConfirm: 3 },
          { id: 'area8', name: 'Area 8', evacuated: 6, confirmed: 0, notConfirm: 2 },
        ],
      },
      {
        id: 'floor6',
        name: 'Rooftop',
        areas: [
          { id: 'area10', name: 'Area B', evacuated: 6, confirmed: 2, notConfirm: 7 },
          { id: 'area11', name: 'Area C', evacuated: 2, confirmed: 1, notConfirm: 6 },
          { id: 'area12', name: 'Area D', evacuated: 0, confirmed: 0, notConfirm: 14 },
        ],
      },
    ],
  },
];

const PIE_COLORS = ['#43a047', '#fdd835', '#ff5252']; // green, yellow, red

const GraphDisplay: React.FC = () => {
  const [entityLevel, setEntityLevel] = useState<'organization' | 'department' | 'district'>(
    'organization',
  );
  const [selectedId, setSelectedId] = useState<string>(dataMap.organization[0].id);

  const handleLevelChange = (
    _: React.MouseEvent<HTMLElement>,
    newLevel: 'organization' | 'department' | 'district' | null,
  ) => {
    if (!newLevel) return;
    setEntityLevel(newLevel);
    setSelectedId(dataMap[newLevel][0].id);
  };

  const handleChange = (e: SelectChangeEvent<string>) => {
    setSelectedId(e.target.value as string);
  };
  const handleMiddleLevelChange = (
    _: React.MouseEvent<HTMLElement>,
    newLevel: 'organization' | 'department' | 'district' | null,
  ) => {
    if (!newLevel) return;
    setMiddleChartLevel(newLevel);
    setMiddleSelectedId(dataMap[newLevel][0].id);
  };

  const handleBottomLevelChange = (
    _: React.MouseEvent<HTMLElement>,
    newLevel: 'organization' | 'department' | 'district' | null,
  ) => {
    if (!newLevel) return;
    setBottomChartLevel(newLevel);
    setBottomSelectedId(dataMap[newLevel][0].id);
  };

  const currData = dataMap[entityLevel];
  const selected = currData.find((x) => x.id === selectedId)!;
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [middleChartLevel, setMiddleChartLevel] = useState<
    'organization' | 'department' | 'district'
  >('organization');
  const [middleSelectedId, setMiddleSelectedId] = useState<string>(dataMap.organization[0].id);

  const [bottomChartLevel, setBottomChartLevel] = useState<
    'organization' | 'department' | 'district'
  >('organization');
  const [bottomSelectedId, setBottomSelectedId] = useState<string>(dataMap.organization[0].id);

  const bottomData = dataMap[bottomChartLevel];
  const bottomSelected = bottomData.find((x) => x.id === bottomSelectedId)!;

  const pieData = [
    { name: 'Evacuated', value: bottomSelected.evacuated },
    { name: 'Confirmed', value: bottomSelected.confirmed },
    { name: 'Not Evacuated', value: bottomSelected.notConfirm },
  ];
  // Pie data for distribution by entity (middle donut chart)
  const middleData = dataMap[middleChartLevel];
  const middleSelected = middleData.find((x) => x.id === middleSelectedId)!;

  const donutData = middleData.map((item) => ({
    name: item.name,
    value: item.evacuated,
  }));

  const getAreaStats = () => {
    let areas: { evacuated: number; confirmed: number; notConfirm: number }[] = [];

    dummyAreaMap.forEach((building) => {
      if (selectedBuilding && building.id !== selectedBuilding) return;

      building.floors.forEach((floor) => {
        if (selectedFloor && floor.id !== selectedFloor) return;

        floor.areas.forEach((area) => {
          if (selectedArea && area.id !== selectedArea) return;
          areas.push({
            evacuated: area.evacuated,
            confirmed: area.confirmed,
            notConfirm: area.notConfirm,
          });
        });
      });
    });

    const evacuated = areas.reduce((sum, a) => sum + a.evacuated, 0);
    const confirmed = areas.reduce((sum, a) => sum + a.confirmed, 0);
    const notConfirm = areas.reduce((sum, a) => sum + a.notConfirm, 0);
    return { evacuated, confirmed, notConfirm };
  };

  const areaPieData = [
    { name: 'Evacuated', value: getAreaStats().evacuated },
    { name: 'Confirmed', value: getAreaStats().confirmed },
    { name: 'Not Evacuated', value: getAreaStats().notConfirm },
  ];

  const dropdownLabel = entityLevel.charAt(0).toUpperCase() + entityLevel.slice(1);
  const generateColors = (count: number): string[] => {
    const colors = [];
    const saturation = 70;
    const lightness = 50;

    for (let i = 0; i < count; i++) {
      const hue = Math.round((360 / count) * i); // spread colors evenly
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  };
  const donutColors = generateColors(donutData.length);

  return (
    <Card
      sx={{
        minWidth: 260,
        minHeight: '80vh',
        maxHeight: '80vh',
        p: 2,
        borderRadius: 4,
        boxShadow: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: '#fff',
        mx: 0,
      }}
    >
      <CardContent sx={{ width: '100%', textAlign: 'center', flex: 1 }}>
        <Typography variant="h6" fontWeight={700} mb={3}>
          Evacuation Statistics
        </Typography>
        <Grid container spacing={2} alignItems="flex-start" sx={{ width: '100%', mb: 2 }}>
          {/* Pie Chart - Top */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                width: '100%',
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    // label={({ name, value }) => `${name}: ${value}`}
                  >
                    {areaPieData.map((entry, idx) => (
                      <Cell key={`cell-top-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  {/* Remove Legend from here */}
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          {/* Filter, Select, and Legend - Right */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack
              direction="row"
              spacing={0}
              alignItems="center"
              justifyContent="flex-start"
              sx={{ mt: 1, flexWrap: 'wrap' }}
            >
              {/* Building Dropdown */}
              <FormControl size="small" sx={{ minWidth: 80, maxWidth: 80 }}>
                <InputLabel id="building-label">Building</InputLabel>
                <Select
                  labelId="building-label"
                  value={selectedBuilding ?? ''}
                  label="Building"
                  onChange={(e) => {
                    setSelectedBuilding(e.target.value || null);
                    setSelectedFloor(null);
                    setSelectedArea(null);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {dummyAreaMap.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Floor Dropdown */}
              <FormControl size="small" sx={{ minWidth: 80, maxWidth: 80 }}>
                <InputLabel id="floor-label">Floor</InputLabel>
                <Select
                  labelId="floor-label"
                  value={selectedFloor ?? ''}
                  label="Floor"
                  onChange={(e) => {
                    setSelectedFloor(e.target.value || null);
                    setSelectedArea(null);
                  }}
                  disabled={!selectedBuilding}
                >
                  <MenuItem value="">All</MenuItem>
                  {dummyAreaMap
                    .find((b) => b.id === selectedBuilding)
                    ?.floors.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Area Dropdown */}
              <FormControl size="small" sx={{ minWidth: 80, maxWidth: 80 }}>
                <InputLabel id="area-label">Area</InputLabel>
                <Select
                  labelId="area-label"
                  value={selectedArea ?? ''}
                  label="Area"
                  onChange={(e) => setSelectedArea(e.target.value || null)}
                  disabled={!selectedFloor}
                >
                  <MenuItem value="">All</MenuItem>
                  {dummyAreaMap
                    .find((b) => b.id === selectedBuilding)
                    ?.floors.find((f) => f.id === selectedFloor)
                    ?.areas.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={2} mt={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#43a047', borderRadius: '3px' }} />
                <Typography variant="body2">Evacuated</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#ffca28', borderRadius: '3px' }} />
                <Typography variant="body2">Confirmed</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#ff5252', borderRadius: '3px' }} />
                <Typography variant="body2">Not Confirmed</Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Total Visitor: {areaPieData.reduce((sum, item) => sum + item.value, 0)}
          </Typography>
          <Divider />
        </Box>
        <Grid container spacing={2} alignItems="flex-start" sx={{ width: '100%', mb: 2 }}>
          {/* Pie Chart - Middle */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                width: '100%',
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    // label={({ name, value }) => `${name}: ${value}`}
                  >
                    {donutData.map((entry, idx) => (
                      <Cell key={`donut-cell-${idx}`} fill={donutColors[idx]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          {/* Filter, Select, and Legend - Right */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={2} alignItems="flex-start" justifyContent="flex-start" sx={{ mt: 1 }}>
              <ToggleButtonGroup
                value={middleChartLevel}
                exclusive
                onChange={handleMiddleLevelChange}
                color="primary"
                size="small"
              >
                <ToggleButton value="organization">Organization</ToggleButton>
                <ToggleButton value="department">Department</ToggleButton>
                <ToggleButton value="district">District</ToggleButton>
              </ToggleButtonGroup>
              <Box sx={{ mt: 2 }}>
                <Stack direction="column" spacing={1}>
                  {donutData.map((entry, idx) => (
                    <Stack direction="row" alignItems="center" spacing={1} key={entry.name}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          bgcolor: donutColors[idx],
                          borderRadius: '3px',
                        }}
                      />
                      <Typography variant="body2">{entry.name}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Total Evacuated Visitor: {donutData.reduce((sum, item) => sum + item.value, 0)}
          </Typography>
          <Divider />
        </Box>
        <Grid container spacing={2} alignItems="flex-start" sx={{ width: '100%' }}>
          {/* Pie Chart - Bottom */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                width: '100%',
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    startAngle={180}
                    endAngle={0}
                    cx="50%"
                    cy="70%"
                    outerRadius="80%"
                    innerRadius="70%"
                    // label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  {/* Remove Legend from here */}
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          {/* Filter, Select, and Legend - Right */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={2} alignItems="flex-start" justifyContent="flex-start" sx={{ mt: 1 }}>
              <ToggleButtonGroup
                value={bottomChartLevel}
                exclusive
                onChange={handleBottomLevelChange}
                color="primary"
                size="small"
              >
                <ToggleButton value="organization">Organization</ToggleButton>
                <ToggleButton value="department">Department</ToggleButton>
                <ToggleButton value="district">District</ToggleButton>
              </ToggleButtonGroup>
              <Select
                size="small"
                value={bottomSelectedId}
                onChange={(event: SelectChangeEvent<string>) =>
                  setBottomSelectedId(event.target.value as string)
                }
                sx={{ minWidth: 130 }}
              >
                {bottomData.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </Select>
              <Box sx={{ mt: 2 }}>
                {/* Manual Legend */}
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#43a047', borderRadius: '3px' }} />
                    <Typography variant="body2">Evacuated</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#ffca28', borderRadius: '3px' }} />
                    <Typography variant="body2">Confirmed</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#ff5252', borderRadius: '3px' }} />
                    <Typography variant="body2">Not Confirmed</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
        <Box mt={1}>
          <Typography variant="body2" color="text.secondary">
            Total Visitor: {bottomSelected.evacuated + bottomSelected.notConfirm}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphDisplay;
