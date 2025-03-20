import { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Slider } from '@mui/material';

const CustomSlider = styled(Slider)(({ theme }) => ({
  '& .MuiSlider-rail': {
    height: '9px',
    borderRadius: '9px',
    opacity: '1',
    backgroundColor: theme.palette.grey[200],
  },
  '& .MuiSlider-thumb': {
    borderRadius: '50%',
    backgroundColor: theme.palette.secondary.main,
    width: '23px',
    height: '23px',
  },
  '& .MuiSlider-track': {
    height: '9px',
    borderRadius: '9px',
  },
}));

interface ZoomControlsProps {
  scale: number;
  setScale: (scale: number) => void;
  applyZoom: (newScale: number) => void;
  minScale?: number;
  maxScale?: number;
}

const ZoomControls = ({
  scale,
  setScale,
  applyZoom,
  minScale = 0.5,
  maxScale = 2,
}: ZoomControlsProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const zoomPercentage = Math.round(scale * 100);
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(128, 128, 128, 0.8)',
        borderRadius: '8px',
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 2,
        width: '400px', // Fixed width for better layout
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <IconButton
        sx={{
          color: 'white',
          fontSize: '20px',
          padding: '4px',
          width: '36px', // Fixed width for circular shape
          height: '36px', // Fixed height for circular shape
          borderRadius: '50%',
          opacity: isHovered ? 1 : 0.4,
          marginRight: '8px',
        }}
        onClick={() => applyZoom(Math.max(scale * 0.9, minScale))}
      >
        -
      </IconButton>

      <CustomSlider
        value={scale}
        min={minScale}
        max={maxScale}
        step={0.1}
        onChange={(_, value) => applyZoom(value as number)}
        sx={{ flex: 1, opacity: isHovered ? 1 : 0.4 }}
      />
      <IconButton
        sx={{
          color: 'white',
          fontSize: '20px',
          padding: '4px',
          width: '36px', // Fixed width for circular shape
          height: '36px', // Fixed height for circular shape
          borderRadius: '50%',
          opacity: isHovered ? 1 : 0.4,
          marginLeft: '8px',
        }}
        onClick={() => applyZoom(Math.min(scale * 1.1, maxScale))}
      >
        +
      </IconButton>
      <Typography
        sx={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          opacity: isHovered ? 1 : 0.4,
        }}
      >
        {zoomPercentage}%
      </Typography>
    </Box>
  );
};

export default ZoomControls;
