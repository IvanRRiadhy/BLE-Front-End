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
import DashboardCard from 'src/components/shared/DashboardCard';

const EmployeeBeacon = 73;
const VisitorBeacon = 74;

interface BeaconDistributionProps {
  data: { name: string; value: number; color?: string }[];
  outerRadius?: number;
  innerRadius?: number;
}

const BeaconList = [
  { name: 'Employee Beacon', value: 73, color: '#43a047' },
  { name: 'Visitor Beacon', value: 25, color: '#ff5252' },
  { name: 'Unknown Beacon', value: 2, color: '#afafaf' },
];

const BeaconDistribution: React.FC<BeaconDistributionProps> = ({
  data = [],
  outerRadius = 100,
  innerRadius = 80,
}) => {
  // console.log("BBeacon Dist", data);
  if (data.length === 1 && data[0].name === 'Loading...') {
    return (
      <Box
        sx={{
          height: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: 'text.secondary',
        }}
      >
        Loading beacon data...
      </Box>
    );
  }
  return (
    <Box sx={{ height: 380 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="65%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default BeaconDistribution;
