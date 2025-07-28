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
} from '@mui/material';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

// Dummy data as before...
const dataMap = {
  organization: [
    { id: 'org1', name: 'Org Alpha', evacuated: 42, notEvacuated: 13 },
    { id: 'org2', name: 'Org Beta', evacuated: 34, notEvacuated: 25 },
    { id: 'org3', name: 'Org Gamma', evacuated: 21, notEvacuated: 37 },
    { id: 'org4', name: 'Org Delta', evacuated: 29, notEvacuated: 8 },
    { id: 'org5', name: 'Org Epsilon', evacuated: 54, notEvacuated: 12 },
  ],
  department: [
    { id: 'dep1', name: 'Dept Security', evacuated: 12, notEvacuated: 3 },
    { id: 'dep2', name: 'Dept Facilities', evacuated: 7, notEvacuated: 2 },
    { id: 'dep3', name: 'Dept HR', evacuated: 16, notEvacuated: 9 },
    { id: 'dep4', name: 'Dept IT', evacuated: 22, notEvacuated: 1 },
    { id: 'dep5', name: 'Dept Finance', evacuated: 11, notEvacuated: 5 },
  ],
  district: [
    { id: 'dist1', name: 'District North', evacuated: 24, notEvacuated: 6 },
    { id: 'dist2', name: 'District South', evacuated: 14, notEvacuated: 13 },
    { id: 'dist3', name: 'District East', evacuated: 19, notEvacuated: 4 },
    { id: 'dist4', name: 'District West', evacuated: 9, notEvacuated: 17 },
    { id: 'dist5', name: 'District Central', evacuated: 28, notEvacuated: 10 },
  ],
};

const PIE_COLORS = ['#43a047', '#ff5252'];

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

  const currData = dataMap[entityLevel];
  const selected = currData.find((x) => x.id === selectedId)!;

  const pieData = [
    { name: 'Evacuated', value: selected.evacuated },
    { name: 'Not Evacuated', value: selected.notEvacuated },
  ];

  const dropdownLabel = entityLevel.charAt(0).toUpperCase() + entityLevel.slice(1);

  return (
    <Card
      sx={{
        minWidth: 260,
        minHeight: '80vh',
        p: 3,
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
          {/* Pie Chart - Left */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                width: '100%',
                height: 220,
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
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    label={({ name, percent }) => `${name}: ${(percent ?? 0).toFixed(0)}%`}
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
                value={entityLevel}
                exclusive
                onChange={handleLevelChange}
                color="primary"
                size="small"
              >
                <ToggleButton value="organization">Organization</ToggleButton>
                <ToggleButton value="department">Department</ToggleButton>
                <ToggleButton value="district">District</ToggleButton>
              </ToggleButtonGroup>
              <Select
                size="small"
                value={selectedId}
                onChange={handleChange}
                sx={{ minWidth: 130 }}
              >
                {currData.map((item) => (
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
                    <Box sx={{ width: 16, height: 16, bgcolor: '#ff5252', borderRadius: '3px' }} />
                    <Typography variant="body2">Not Evacuated</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
        <Box mt={1}>
          <Typography variant="body2" color="text.secondary">
            Total Visitor: {selected.evacuated + selected.notEvacuated}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphDisplay;
