import { Box, Typography, useTheme } from '@mui/material';
import React from 'react';

export type PaletteColorKey = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

interface TopStatBoxProps {
  label: string;
  value?: number;
  color?: PaletteColorKey;
}

const TopStatBox: React.FC<TopStatBoxProps> = ({ label, value = 0, color = 'primary' }) => {
  const theme = useTheme();
  const palette = theme.palette[color];

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${palette.main}`,
        backgroundColor: palette.light,

        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',

        height: {
          xs: 82, // compact mobile
          sm: 96,
          md: 110, // desktop breathing room
        },

        px: {
          xs: 1,
          md: 1.5,
        },

        py: {
          xs: 0.5, // 🔑 reduce mobile vertical gap
          md: 1.5,
        },
      }}
    >
      {/* Label */}
      <Typography
        sx={{
          fontSize: { xs: 11, sm: 13 },
          mb: { xs: 0.25, sm: 0.5 },
          color: palette.dark,
        }}
      >
        {label}
      </Typography>

      {/* Number */}
      <Typography
        sx={{
          fontSize: { xs: 26, sm: 32, md: 36 },
          fontWeight: 700,
          lineHeight: 1,
          color: palette.main,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default TopStatBox;
