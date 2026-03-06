import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Box,
  Grid2 as Grid,
  Button,
} from '@mui/material';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import SnakeChevronBackground from 'src/components/master/Security/PatrolRoute/RouteDialogBackground';
import SortablePatrolAreaCard from 'src/components/master/Security/PatrolRoute/SortablePatrolAreaCard';
import { useAllPatrolAreas } from 'src/hooks/usePatrolArea';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';
import { PatrolRouteType } from 'src/store/apps/crud/patrolRoute';

interface Props {
  open: boolean;
  route?: PatrolRouteType;
  onClose: () => void;
}

const COLUMNS = 4;
const CARD_WIDTH = 220;
const CARD_HEIGHT = 320;

const PatrolRouteDetailDialog = ({ open, route, onClose }: Props) => {
  if (!route) return null;
  const areas = route.patrolAreas ?? [];
  const rows = Math.ceil((areas.length + 1) / COLUMNS);
  const { data: patrolAreaData = [] } = useAllPatrolAreas();
  const resolvedAreas = useMemo<PatrolAreaType[]>(() => {
    if (!route?.patrolAreas?.length) return [];

    return [...route.patrolAreas]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((pa) => patrolAreaData.find((p) => p.id === pa.patrolAreaId))
      .filter(Boolean) as PatrolAreaType[];
  }, [route?.patrolAreas, patrolAreaData]);

  const dwellMap = useMemo(() => {
    if (!route?.patrolAreas) return new Map();

    const map = new Map();

    route.patrolAreas.forEach((a) => {
      map.set(a.patrolAreaId, {
        min: a.minDwellTime ?? 0,
        max: a.maxDwellTime ?? 0,
      });
    });

    return map;
  }, [route?.patrolAreas]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      {/* ===== HEADER ===== */}
      <DialogTitle sx={{ pb: 2 }}>
        <Typography variant="h4" fontWeight={700}>
          {route.name}
        </Typography>
        <Typography fontSize={14} color="text.secondary">
          {route.description}
        </Typography>
      </DialogTitle>

      <Divider />

      {/* ===== CONTENT ===== */}
      <DialogContent sx={{ position: 'relative', overflow: 'hidden', p: 0 }}>
        <Box
          sx={{
            position: 'relative',
            overflowY: 'auto',
            maxHeight: '65vh',
            px: 3,
            py: 2,
          }}
        >
          {/* Content */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Grid container spacing={3}>
              {resolvedAreas.map((area, index) => {
                const rowIndex = Math.floor(index / COLUMNS);
                const colIndex = index % COLUMNS;
                const isRTL = rowIndex % 2 === 1;
                const isEndOfRow = colIndex === COLUMNS - 1;
                const dwell = dwellMap.get(area.id);
                console.log("dwell time",dwell)
                return (
                  <Grid key={area.id} size={{ xs: 12, sm: 6, md: 3 }}>
                    <SortablePatrolAreaCard
                      area={area}
                      index={index + 1}
                      cardWidth={CARD_WIDTH}
                      cardHeight={CARD_HEIGHT}
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                      isRTL={isRTL}
                      isEndOfRow={isEndOfRow}
                      isLast={index === areas.length - 1}
                      onRemove={() => {}}
                      readOnly // 👈 IMPORTANT
                      minDwellTime={dwell?.min ?? 0}
                      maxDwellTime={dwell?.max ?? 0}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PatrolRouteDetailDialog;
