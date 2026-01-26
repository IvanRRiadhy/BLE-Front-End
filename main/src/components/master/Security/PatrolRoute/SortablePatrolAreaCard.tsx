import {
  IconArrowRight,
  IconArrowLeft,
  IconArrowDownRight,
  IconArrowDownLeft,
  IconTrash,
} from '@tabler/icons-react';

import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { Box, Card, Grid2 as Grid, Typography } from '@mui/material';
import { IconGripHorizontal } from '@tabler/icons-react';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';
import { useEffect, useRef, useState } from 'react';

interface SortablePatrolAreaCardProps {
  area: PatrolAreaType;
  index: number;
  rowIndex: number;
  colIndex: number;
  isRTL: boolean;
  isEndOfRow: boolean;
  isLast: boolean;
  onRemove: (id: string) => void;
}

const SortablePatrolAreaCard = ({
  area,
  index,
  rowIndex,
  colIndex,
  isRTL,
  isEndOfRow,
  isLast,
  onRemove,
}: SortablePatrolAreaCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: area.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [showTrash, setShowTrash] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const showWithTimeout = () => {
    setShowTrash(true);

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    hideTimer.current = window.setTimeout(() => {
      setShowTrash(false);
    }, 3000);
  };

  const hideImmediately = () => {
    setShowTrash(false);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // Hide trash when dragging starts
  useEffect(() => {
    if (isDragging) {
      hideImmediately();
    }
  }, [isDragging]);

  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Box ref={setNodeRef} style={style}>
        <Card
          onMouseEnter={showWithTimeout}
          onMouseLeave={hideImmediately}
          sx={{
            height: 320,
            width: 220,
            borderRadius: 3,
            position: 'relative',
            opacity: isDragging ? 0.6 : 1,
          }}
        >
          <Box 
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 2,

              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'grey.300',
              color: 'text.primary',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              boxShadow: 2,
              // cursor: 'pointer',
            }}
          >
            <Typography variant="caption" fontWeight={700}>
              {index}
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,

              width: 32,
              height: 32,
              borderRadius: '50%',

              bgcolor: 'error.main',
              color: 'error.contrastText',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              boxShadow: 2,
              cursor: 'pointer',

              // ✨ Fade animation
              opacity: showTrash ? 1 : 0,
              transform: showTrash ? 'scale(1)' : 'scale(0.9)',
              transition: showTrash
                ? 'opacity 200ms ease-out, transform 200ms ease-out'
                : 'opacity 350ms ease-in, transform 350ms ease-in',
              // Prevent interaction when hidden
              pointerEvents: showTrash ? 'auto' : 'none',
              backdropFilter: 'blur(2px)',

              '&:hover': {
                bgcolor: 'error.dark',
              },
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(area.id);
              setShowTrash(false);
            }}
          >
            <IconTrash size={16} />
          </Box>
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
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {area.name}
            </Typography>

            <Typography variant="subtitle2" fontSize={12} color="text.secondary">
              <Box component="span" fontWeight={700}>
                Floor:
              </Box>{' '}
              {area.floorId}
            </Typography>

            <Typography variant="caption" fontSize={12} color="text.secondary">
              <Box component="span" fontWeight={700}>
                Description:
              </Box>{' '}
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
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',

              '&:active': {
                cursor: 'grabbing',
              },
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
