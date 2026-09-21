import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { DetectedArea } from 'devtools-floorplan-detection';
import { AreaComputedStats } from '../types/ui';

interface AreaPropertiesProps {
  selectedArea: DetectedArea | null;
  stats: AreaComputedStats | undefined;
  onUpdateName: (id: string, newName: string) => void;
}

export const AreaProperties: React.FC<AreaPropertiesProps> = ({
  selectedArea,
  stats,
  onUpdateName,
}) => {
  const [nameInput, setNameInput] = useState<string>('');

  useEffect(() => {
    if (selectedArea) {
      setNameInput(selectedArea.name || '');
    }
  }, [selectedArea]);

  if (!selectedArea || !stats) {
    return (
      <Box sx={{ p: 2.5, textAlign: 'center', color: '#6b7280' }}>
        <Typography variant="body2">
          Select an area on the canvas or list to view engineering properties.
        </Typography>
      </Box>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    onUpdateName(selectedArea.id, val);
  };

  return (
    <Box sx={{ p: 2, overflowY: 'auto', maxHeight: '100%' }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <EditIcon sx={{ fontSize: 16, color: '#38bdf8' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Area Properties
        </Typography>
      </Box>

      {/* Editable Area Name Input */}
      <TextField
        fullWidth
        size="small"
        label="Area Name"
        value={nameInput}
        onChange={handleNameChange}
        placeholder="e.g. Lobby, Meeting Room..."
        helperText="Changes regenerate BIONIC Production JSON in real time"
        FormHelperTextProps={{ sx: { fontSize: '0.68rem', color: '#64748b' } }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0b0f17',
            color: '#f8fafc',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            '& fieldset': { borderColor: '#334155' },
            '&:hover fieldset': { borderColor: '#475569' },
            '&.Mui-focused fieldset': { borderColor: '#0284c7' },
          },
          '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.85rem' },
        }}
      />

      <Divider sx={{ borderColor: '#1f2937', my: 1.5 }} />

      {/* Metrics Summary Grid */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              backgroundColor: '#0b0f17',
              borderColor: '#1e293b',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SquareFootIcon sx={{ fontSize: 13 }} /> Approx Area
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#e2e8f0', mt: 0.3, fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round(stats.approxAreaSqPx).toLocaleString()} px²
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              backgroundColor: '#0b0f17',
              borderColor: '#1e293b',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CenterFocusStrongIcon sx={{ fontSize: 13 }} /> Visual Center
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#38bdf8', mt: 0.3, fontFamily: "'JetBrains Mono', monospace" }}>
              {`(${stats.visualCenter.posX}, ${stats.visualCenter.posY})`}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              backgroundColor: '#0b0f17',
              borderColor: '#1e293b',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Bounding Box (minX, minY) &rarr; (maxX, maxY)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#cbd5e1', mt: 0.3, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
              {`[${stats.bounds.minX}, ${stats.bounds.minY}] → [${stats.bounds.maxX}, ${stats.bounds.maxY}] (${stats.bounds.width}×${stats.bounds.height} px)`}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Polygon Vertices Table */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
          Vertices ({selectedArea.polygon.length})
        </Typography>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          backgroundColor: '#0b0f17',
          borderColor: '#1e293b',
          maxHeight: 200,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: '#111827', color: '#94a3b8', fontSize: '0.7rem', py: 0.5 }}>
                Idx
              </TableCell>
              <TableCell sx={{ backgroundColor: '#111827', color: '#94a3b8', fontSize: '0.7rem', py: 0.5 }}>
                Pixel (X, Y)
              </TableCell>
              <TableCell sx={{ backgroundColor: '#111827', color: '#94a3b8', fontSize: '0.7rem', py: 0.5 }}>
                World (X, Y)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedArea.polygon.map((pt, idx) => (
              <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#1e293b' } }}>
                <TableCell sx={{ color: '#64748b', fontSize: '0.72rem', py: 0.4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {idx}
                </TableCell>
                <TableCell sx={{ color: '#e2e8f0', fontSize: '0.72rem', py: 0.4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {`(${pt.xPx}, ${pt.yPx})`}
                </TableCell>
                <TableCell sx={{ color: '#38bdf8', fontSize: '0.72rem', py: 0.4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {`(${pt.x}, ${pt.y})`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
