import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import { DetectedArea } from 'devtools-floorplan-detection';

interface AreaListProps {
  areas: DetectedArea[];
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  onSelectArea: (id: string) => void;
  onHoverArea: (id: string | null) => void;
}

export const AreaList: React.FC<AreaListProps> = ({
  areas,
  selectedAreaId,
  hoveredAreaId,
  onSelectArea,
  onHoverArea,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.2,
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LayersIcon sx={{ fontSize: 18, color: '#38bdf8' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f3f4f6' }}>
            Detected Areas
          </Typography>
        </Box>
        <Chip
          label={areas.length}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.72rem',
            backgroundColor: '#1e293b',
            color: '#38bdf8',
            fontWeight: 700,
            border: '1px solid #334155',
          }}
        />
      </Box>

      {/* Areas List */}
      <List sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
        {areas.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No areas detected.
            </Typography>
            <Typography variant="caption" sx={{ color: '#4b5563', mt: 0.5, display: 'block' }}>
              Upload an image or load the mock floorplan.
            </Typography>
          </Box>
        ) : (
          areas.map((area, index) => {
            const isSelected = area.id === selectedAreaId;
            const isHovered = area.id === hoveredAreaId;

            return (
              <ListItemButton
                key={area.id}
                selected={isSelected}
                onClick={() => onSelectArea(area.id)}
                onMouseEnter={() => onHoverArea(area.id)}
                onMouseLeave={() => onHoverArea(null)}
                sx={{
                  borderRadius: 1,
                  mb: 0.8,
                  py: 1,
                  px: 1.5,
                  border: '1px solid',
                  borderColor: isSelected
                    ? '#0284c7'
                    : isHovered
                    ? '#334155'
                    : '#1e293b',
                  backgroundColor: isSelected
                    ? 'rgba(2, 132, 199, 0.15)'
                    : isHovered
                    ? '#131b29'
                    : '#0d131f',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(2, 132, 199, 0.18)',
                    '&:hover': {
                      backgroundColor: 'rgba(2, 132, 199, 0.25)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#131b29',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#38bdf8' : '#228B22',
                    mr: 1.5,
                    boxShadow: isSelected ? '0 0 8px #38bdf8' : 'none',
                  }}
                />
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#f0f9ff' : '#e2e8f0',
                      }}
                    >
                      {area.name || `Area_${String(index + 1).padStart(3, '0')}`}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                      {`${area.polygon.length} vertices`}
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>
    </Box>
  );
};
