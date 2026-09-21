import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  LinearProgress,
  List,
  ListItemButton,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { FloorplanFileItem } from '../../types/annotation';

interface FloorplanSidebarProps {
  floorplans: FloorplanFileItem[];
  selectedFilename: string | null;
  loading: boolean;
  onSelectFloorplan: (filename: string) => void;
  onRefresh: () => void;
}

export const FloorplanSidebar: React.FC<FloorplanSidebarProps> = ({
  floorplans,
  selectedFilename,
  loading,
  onSelectFloorplan,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ANNOTATED' | 'UNANNOTATED'>('ALL');

  // Stats
  const totalCount = floorplans.length;
  const annotatedCount = floorplans.filter((f) => f.status === 'Annotated').length;
  const progressPercent = totalCount > 0 ? Math.round((annotatedCount / totalCount) * 100) : 0;

  // Filtered list
  const filteredFloorplans = useMemo(() => {
    return floorplans.filter((f) => {
      const matchesSearch = f.filename.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === 'ANNOTATED') return f.status === 'Annotated';
      if (statusFilter === 'UNANNOTATED') return f.status !== 'Annotated';
      return true;
    });
  }, [floorplans, searchQuery, statusFilter]);

  return (
    <Box
      sx={{
        width: 320,
        height: '100%',
        backgroundColor: '#0c111c',
        borderRight: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Header & Progress */}
      <Box sx={{ p: 2, borderBottom: '1px solid #1f2937' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc', letterSpacing: 0.5 }}>
            Floorplans ({totalCount})
          </Typography>
          <Tooltip title="Refresh dataset from disk">
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{ color: '#94a3b8', '&:hover': { color: '#38bdf8' } }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Progress tracker */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
              Progress:
            </Typography>
            <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700 }}>
              {annotatedCount} / {totalCount} annotated ({progressPercent}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#1e293b',
              '& .MuiLinearProgress-bar': {
                backgroundColor: progressPercent === 100 ? '#10b981' : '#0284c7',
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Search Input */}
        <TextField
          size="small"
          fullWidth
          placeholder="Filter floorplans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748b', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 1.2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#111827',
              fontSize: '0.78rem',
              color: '#f8fafc',
              borderRadius: 1,
              '& fieldset': { borderColor: '#1f2937' },
              '&:hover fieldset': { borderColor: '#374151' },
              '&.Mui-focused fieldset': { borderColor: '#0284c7' },
            },
          }}
        />

        {/* Filter Toggle Buttons */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={statusFilter}
          onChange={(_, val) => val && setStatusFilter(val)}
          sx={{
            width: '100%',
            height: 26,
            '& .MuiToggleButton-root': {
              flex: 1,
              fontSize: '0.68rem',
              fontWeight: 600,
              textTransform: 'none',
              color: '#94a3b8',
              borderColor: '#1f2937',
              '&.Mui-selected': {
                backgroundColor: '#1e293b',
                color: '#38bdf8',
              },
            },
          }}
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="ANNOTATED">Annotated</ToggleButton>
          <ToggleButton value="UNANNOTATED">Unannotated</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Floorplan Image List */}
      <List sx={{ flex: 1, overflowY: 'auto', p: 1, m: 0 }}>
        {filteredFloorplans.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: '#64748b' }}>
            <Typography variant="body2">No floorplans match filter</Typography>
          </Box>
        ) : (
          filteredFloorplans.map((item) => {
            const isSelected = item.filename === selectedFilename;
            const isAnnotated = item.status === 'Annotated';
            const isInProgress = item.status === 'In Progress';

            return (
              <ListItemButton
                key={item.filename}
                selected={isSelected}
                onClick={() => onSelectFloorplan(item.filename)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  px: 1.5,
                  py: 1,
                  backgroundColor: isSelected ? '#1e293b' : 'transparent',
                  border: isSelected ? '1px solid #0284c7' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: isSelected ? '#1e293b' : '#111827',
                  },
                }}
              >
                <Box sx={{ mr: 1.2, display: 'flex', alignItems: 'center' }}>
                  {isAnnotated ? (
                    <Tooltip title="Annotated (Ground Truth ready)">
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />
                    </Tooltip>
                  ) : isInProgress ? (
                    <Tooltip title="In Progress">
                      <DonutLargeIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Not Annotated">
                      <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    </Tooltip>
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#f8fafc' : '#cbd5e1',
                      fontSize: '0.8rem',
                    }}
                  >
                    {item.filename}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                      {item.imageWidth}×{item.imageHeight}
                    </Typography>
                    {isAnnotated ? (
                      <Chip
                        size="small"
                        label={`${item.roomCount} areas`}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          backgroundColor: '#064e3b',
                          color: '#a7f3d0',
                          border: '1px solid #059669',
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                        Not annotated
                      </Typography>
                    )}
                  </Box>
                </Box>
              </ListItemButton>
            );
          })
        )}
      </List>
    </Box>
  );
};
