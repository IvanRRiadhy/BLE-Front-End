import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';

import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { Box, Card, Grid2 as Grid, Typography } from '@mui/material';
import { IconGripHorizontal } from '@tabler/icons-react';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';

interface SortablePatrolAreaCardProps {
  area: PatrolAreaType;
}

const SortablePatrolAreaCard = ({ area }: SortablePatrolAreaCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: area.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Box ref={setNodeRef} style={style}>
        <Card
          sx={{
            height: 320,
            width: 220,
            borderRadius: 3,
            position: 'relative',
            opacity: isDragging ? 0.6 : 1,
          }}
        >
          {/* 🔳 Area Preview */}
          <Box
            sx={{
              width: '80%',
              aspectRatio: '1 / 1',
              bgcolor: 'grey.100',
              borderBottom: 1,
              borderColor: 'divider',
              mx: 'auto',
            }}
          />

          {/* 📋 Info */}
          <Box sx={{ p: 1.5, flex: 1, minHeight: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {area.name}
            </Typography>

            <Typography variant="caption" color="text.secondary" noWrap>
              Floor: {area.floorId}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {area.remarks || '—'}
            </Typography>
          </Box>

          {/* ⠿ Drag Handle */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              position: 'absolute',
              bottom: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'text.disabled',
              cursor: 'grab',
            }}
          >
            <IconGripHorizontal size={18} stroke={1.5} />
          </Box>
        </Card>
      </Box>
    </Grid>
  );
};

export default SortablePatrolAreaCard;
