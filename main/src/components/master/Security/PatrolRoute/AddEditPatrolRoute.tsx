import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Box,
  FormHelperText,
  Stack,
  Card,
} from '@mui/material';
import { IconGripHorizontal, IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { defaultPatrolRouteForm } from 'src/store/apps/defaultForm';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { PatrolRouteType } from 'src/store/apps/crud/patrolRoute';
import { useAddPatrolRoute, useEditPatrolRoute } from 'src/hooks/usePatrolRoute';
import { useAllPatrolAreas } from 'src/hooks/usePatrolArea';
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
import SortablePatrolAreaCard from './SortablePatrolAreaCard';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';

interface FormType {
  type?: 'add' | 'edit';
  patrolRoute?: PatrolRouteType;
}

const COLUMNS = 4;


const AddEditPatrolRoute = ({ type, patrolRoute }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    ...defaultPatrolRouteForm,
    ...patrolRoute,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  //Hooks
  const addMutation = useAddPatrolRoute();
  const editMutation = useEditPatrolRoute();
  const { data: PatrolAreaData = [] } = useAllPatrolAreas();
  const selectedAreas = formData.patrolAreaIds
    .map((id) => PatrolAreaData.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => a != null);
  const availableAreas = PatrolAreaData.filter((a) => !formData.patrolAreaIds.includes(a.id));

  // 🧭 Open/close dialog
  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && patrolRoute) {
      setFormData({ ...defaultPatrolRouteForm, ...patrolRoute });
    } else {
      setFormData({ ...defaultPatrolRouteForm });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // Add or Append New Patrol Area
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [selectedAreaToAdd, setSelectedAreaToAdd] = useState<string | null>(null);

  // 🧩 Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Floor name is required';
    if (!formData.patrolAreaIds || formData.patrolAreaIds.length === 0)
      errors.patrolAreaIds = 'Patrol Area is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        patrolAreaIds: formData.patrolAreaIds,
      };
      if (type === 'add') {
        await addMutation.mutateAsync(payload);
        toast.success('Floor added successfully!');
      } else {
        await editMutation.mutateAsync(payload);
        toast.success('Floor updated successfully!');
      }
      handleClose();
    } catch (err) {
      toast.error('Failed to save route');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };
  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { id?: string; name?: string; value: string } },
  ) => {
    const { id, name, value } = e.target;
    const key = (id || name) as keyof typeof formData; // ✅ explicitly assert string key
    if (!key) return; // safeguard

    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}
const snakeOrderedAreas = React.useMemo(() => {
  const rows = chunk(selectedAreas, COLUMNS);

  return rows.flatMap((row, rowIndex) =>
    rowIndex % 2 === 0 ? row : [...row].reverse()
  );
}, [selectedAreas]);

type RenderItem =
  | { type: 'area'; area: PatrolAreaType }
  | { type: 'add' }
  | { type: 'spacer'; key: string };

const renderItems = React.useMemo<RenderItem[]>(() => {
  // 1️⃣ build base list (areas + add)
  const base: RenderItem[] = [
    ...selectedAreas.map((a) => ({ type: 'area', area: a } as const)),
    { type: 'add' } as const,
  ];

  // 2️⃣ chunk into rows
  const rows: RenderItem[][] = [];
  for (let i = 0; i < base.length; i += COLUMNS) {
    rows.push(base.slice(i, i + COLUMNS));
  }

  // 3️⃣ apply snake direction PER ROW
  const snakeRows = rows.map((row, rowIndex) => {
    const isRTL = rowIndex % 2 === 1;
    return isRTL ? [...row].reverse() : row;
  });

  // 4️⃣ pad LAST ROW if it is RTL
  const lastRowIndex = snakeRows.length - 1;
  const lastRow = snakeRows[lastRowIndex];

  if (lastRowIndex % 2 === 1 && lastRow.length < COLUMNS) {
    const padCount = COLUMNS - lastRow.length;
    const spacers = Array.from({ length: padCount }, (_, i) => ({
      type: 'spacer' as const,
      key: `spacer-${i}`,
    }));
    snakeRows[lastRowIndex] = [...spacers, ...lastRow];
  }

  // 5️⃣ flatten back
  return snakeRows.flat();
}, [selectedAreas]);



  const handleDragEnd = (event: DragEndEvent) => {
    // console.log('patrolAreaIds', formData.patrolAreaIds);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFormData((prev) => {
      const oldIndex = prev.patrolAreaIds.indexOf(active.id as string);
      const newIndex = prev.patrolAreaIds.indexOf(over.id as string);

      return {
        ...prev,
        patrolAreaIds: arrayMove(prev.patrolAreaIds, oldIndex, newIndex),
      };
    });
    // console.log('patrolAreaIds', formData.patrolAreaIds);
  };

  return (
    <>
      {/* Trigger buttons */}
      {type === 'edit' && (
        <Tooltip title="Edit Patrol Route">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {type === 'add' && (
        <Tooltip title="Add Patrol Route">
          <Button
            variant="contained"
            color="primary"
            sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            onClick={handleClickOpen}
          >
            <IconPlus size={20} />
          </Button>
        </Tooltip>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogContent sx={{ pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Title */}
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="h4" fontWeight={700}>
                {type === 'add' ? 'Add Route' : 'Edit Route'}
              </Typography>
            </Grid>

            {/* Route Name */}
            <Grid size={{ xs: 12, md: 3 }}>
              {/* <CustomFormLabel htmlFor="name">Route Name</CustomFormLabel> */}
              <CustomTextField
                id="name"
                value={formData.name}
                label="Route Name"
                onChange={handleInputChange}
                fullWidth
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12, md: 4 }}>
              {/* <CustomFormLabel htmlFor="description">Description</CustomFormLabel> */}
              <CustomTextField
                id="description"
                value={formData.description}
                label="Description"
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        {/* ===== MAIN CONTENT ===== */}
        <DialogContent sx={{ flex: 1 }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={formData.patrolAreaIds} strategy={rectSortingStrategy}>
              <Grid container spacing={3}>
  {renderItems.map((item, index) => {
    if (item.type === 'spacer') {
      return (
        <Grid key={item.key} size={{ xs: 12, sm: 6, md: 3 }} />
      );
    }

    if (item.type === 'add') {
      return (
        <Grid key="add" size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            onClick={() => setAddAreaOpen(true)}
            sx={{
              height: 320,
              width: 220,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'divider',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconPlus size={48} />
          </Card>
        </Grid>
      );
    }

    return (
      <SortablePatrolAreaCard
        key={item.area.id}
        area={item.area}
      />
    );
  })}
</Grid>

            </SortableContext>
          </DndContext>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ fontSize: '1rem', py: 1, px: 3 }}
            disabled={isSaving || formData.patrolAreaIds.length < 2}
          >
            {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={addAreaOpen} onClose={() => setAddAreaOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Patrol Area</DialogTitle>

        <DialogContent>
          <Autocomplete
            options={availableAreas}
            getOptionLabel={(o) => o.name}
            value={availableAreas.find((a) => a.id === selectedAreaToAdd) || null}
            onChange={(_, value) => setSelectedAreaToAdd(value?.id ?? null)}
            renderInput={(params) => <TextField {...params} label="Available Patrol Areas" />}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setAddAreaOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedAreaToAdd}
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                patrolAreaIds: [...prev.patrolAreaIds, selectedAreaToAdd!],
              }));
              setSelectedAreaToAdd(null);
              setAddAreaOpen(false);
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditPatrolRoute;
