import { useEffect, useMemo, useState } from 'react';
import {
  Backdrop,
  Box,
  CircularProgress,
  List,
  Skeleton,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  Divider,
  Grid2 as Grid,
  Chip,
} from '@mui/material';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'src/store/Store';
import { CardUsageType } from 'src/store/apps/crud/cardRecord';
import { uniqueId } from 'lodash';

interface CardUsageItemProps {
  data: CardUsageType;
  onClick: () => void;
}

const CardUsageItem = ({ data, onClick }: CardUsageItemProps) => {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
      <Box
        onClick={onClick}
        sx={{
          border: '1px solid #CCC',
          borderRadius: 1.5,
          p: 1,
          height: '100%',
          bgcolor: '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
            bgcolor: '#f5f5f5',
          },
        }}
      >
        <Grid
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography fontWeight={700} fontSize="0.75rem">
            Card Number : {data.cardNumber}
          </Typography>
          {data.status === 'Active' && (
            <Chip
              size="small"
              label={data.status}
              sx={{ bgcolor: 'success.main', color: 'white' }}
            />
          )}
        </Grid>

        <Stack direction="row" spacing={1} mt={1}>
          <Typography fontWeight={700} fontSize="0.75rem">
            Last Used By : {data.lastUsedBy  || 'Unknown'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} mt={1}>
          <Typography fontWeight={700} fontSize="0.75rem">
            Card Usage :
          </Typography>
          <Chip
            size="small"
            label={data.totalUsage}
            sx={{ bgcolor: 'secondary.main', color: 'white' }}
          />
        </Stack>
      </Box>
    </Grid>
  );
};

export default CardUsageItem;
