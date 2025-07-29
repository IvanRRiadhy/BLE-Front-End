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

const BeaconList = [
  { name: 'EmployeeBeacon', value: 73, color: '#43a047' },
  { name: 'VisitorBeacon', value: 25, color: '#ff5252' },
  { name: 'UnknownBeacon', value: 2, color: '#afafaf' },
];

const BeaconDistribution = () => {
  return (
    <DashboardCard title="Beacon Distribution" subtitle="Beacon Distribution" >
      <Box  sx={{ height: 380 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={BeaconList}
              dataKey="value"
              nameKey="name"
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
            //   fill="#8884d8"
              label={({ name, value }) => `${name}: ${value} Card`}
            >
              {BeaconList.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </DashboardCard>
  );
};

export default BeaconDistribution;
