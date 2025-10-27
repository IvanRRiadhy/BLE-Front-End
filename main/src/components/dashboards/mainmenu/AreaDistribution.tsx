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

const AreaList =[
    {name: 'Area 1', value: 21, color: '#43a047'},
    {name: 'Area 2', value: 17, color: '#ff5252'},
    {name: 'Area 3', value: 4, color: '#afafaf'},
    {name: 'Area 4', value: 19, color: '#43a047'},
    {name: 'Area 5', value: 26, color: '#ff5252'},
    {name: 'Area 6', value: 11, color: '#afafaf'},
    {name: 'Area 7', value: 27, color: '#43a047'},
    {name: 'Area 8', value: 2, color: '#ff5252'},
];

const AreaDistribution = () => {
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
    const areaColors = generateColors(AreaList.length);
    return (
            <Box sx={{height: 380}}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                        data={AreaList}
                        dataKey={"value"}
                        nameKey={"name"}
                        cx={"50%"}
                        cy={"50%"}
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value} Card`}
                        >
                            {AreaList.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={areaColors[index]} />
                            ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </Box>
    );
};

export default AreaDistribution;