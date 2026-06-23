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
  Card,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { defaultPatrolRouteForm, defaultTimeGroupFilter } from 'src/store/apps/defaultForm';
import { PatrolRouteType } from 'src/store/apps/crud/patrolRoute';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';

import { useAddPatrolRoute, useEditPatrolRoute } from 'src/hooks/usePatrolRoute';
import { useAllPatrolAreas } from 'src/hooks/usePatrolArea';
import { useTimeGroupList } from 'src/hooks/useTimeGroup';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';

import SortablePatrolAreaCard from './SortablePatrolAreaCard';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { FloorplanType } from 'src/store/apps/crud/floorplan';

interface FormType {
  type?: 'add' | 'edit';
  patrolRoute?: PatrolRouteType;
}

const COLUMNS = 4;
const CARD_HEIGHT = 340;
const CARD_WIDTH = 220;

const AddEditPatrolRoute = ({ type, patrolRoute }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [selectedAreaToAdd, setSelectedAreaToAdd] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ...defaultPatrolRouteForm,
    ...patrolRoute,
    routeAreas:
      patrolRoute?.routeAreas ??
      patrolRoute?.patrolAreas?.map((a) => ({
        patrolAreaId: a.patrolAreaId,
        minDwellTime: a.minDwellTime ?? 0,
        maxDwellTime: a.maxDwellTime ?? 0,
      })) ??
      [],
  });
  
  /* ===== hooks ===== */
  const addMutation = useAddPatrolRoute();
  const editMutation = useEditPatrolRoute();
  const { data: patrolAreaData = [] } = useAllPatrolAreas();
  const { data: floorplanData = []} = useAllFloorplans();
  useTimeGroupList({
    ...defaultTimeGroupFilter,
    Length: 999,
    filters: { ScheduleType: 'Patrol' },
  });

  /* ===== derived ===== */
  const selectedAreas = formData.routeAreas
    .map((r) => patrolAreaData.find((a) => a.id === r.patrolAreaId))
    .filter((a): a is NonNullable<typeof a> => a != null);

  const availableAreas = patrolAreaData.filter(
    (a) => !formData.routeAreas.some((r) => r.patrolAreaId === a.id),
  );

  /* ===== dialog control ===== */
  const handleClickOpen = () => {
    setFormErrors({});

    setFormData(
      type === 'edit' && patrolRoute
        ? {
            ...defaultPatrolRouteForm,
            ...patrolRoute,
            routeAreas:
              patrolRoute.routeAreas ??
              patrolRoute.patrolAreas?.map((a) => ({
                patrolAreaId: a.patrolAreaId,
                minDwellTime: a.minDwellTime ?? 0,
                maxDwellTime: a.maxDwellTime ?? 0,
              })) ??
              [],
          }
        : {
            ...defaultPatrolRouteForm,
            routeAreas: [],
          },
    );

    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  /* ===== validation ===== */
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Route Name is required';
    if (!formData.routeAreas.length) errors.patrolAreaIds = 'Patrol Area is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ===== save ===== */
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
        routeAreas: formData.routeAreas,
      };

      type === 'add'
        ? await addMutation.mutateAsync(payload)
        : await editMutation.mutateAsync(payload);

      toast.success('Route saved successfully');
      handleClose();
    } catch {
      toast.error('Failed to save route');
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
    const key = (id || name) as keyof typeof formData;
    if (!key) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  /* ===== dnd ===== */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFormData((prev) => {
      const oldIndex = prev.routeAreas.findIndex((r) => r.patrolAreaId === active.id);
      const newIndex = prev.routeAreas.findIndex((r) => r.patrolAreaId === over.id);

      return {
        ...prev,
        routeAreas: arrayMove(prev.routeAreas, oldIndex, newIndex),
      };
    });
  };
  const handleRemoveArea = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      routeAreas: prev.routeAreas.filter((x) => x.patrolAreaId !== id),
    }));
  };

  /* ===== render ===== */
  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Patrol Route">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {type === 'add' && (
        <Tooltip title="Add Patrol Route">
          <Button variant="contained" onClick={handleClickOpen}>
            <IconPlus size={20} />
          </Button>
        </Tooltip>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle sx={{ pb: 2 }}>
          {' '}
          <Grid container spacing={2} alignItems="center">
            {' '}
            {/* Title */}{' '}
            <Grid size={{ xs: 12, md: 2 }}>
              {' '}
              <Typography variant="h4" fontWeight={700}>
                {' '}
                {type === 'add' ? 'Add Route' : 'Edit Route'}{' '}
              </Typography>{' '}
            </Grid>{' '}
            {/* Route Name */}{' '}
            <Grid size={{ xs: 12, md: 3 }}>
              {' '}
              {/* <CustomFormLabel htmlFor="name">Route Name</CustomFormLabel> */}{' '}
              <CustomTextField
                id="name"
                value={formData.name}
                label="Route Name"
                onChange={handleInputChange}
                fullWidth
                error={!!formErrors.name}
                helperText={formErrors.name}
              />{' '}
            </Grid>{' '}
            {/* Description */}{' '}
            <Grid size={{ xs: 12, md: 4 }}>
              {' '}
              {/* <CustomFormLabel htmlFor="description">Description</CustomFormLabel> */}{' '}
              <CustomTextField
                id="description"
                value={formData.description}
                label="Description"
                onChange={handleInputChange}
                fullWidth
              />{' '}
            </Grid>{' '}
          </Grid>{' '}
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2 }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToFirstScrollableAncestor]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={formData.routeAreas.map((r) => r.patrolAreaId)}
                strategy={rectSortingStrategy}
              >
                <Grid container spacing={3}>
                  {selectedAreas.map((area, index) => {
                    const routeArea = formData.routeAreas.find((r) => r.patrolAreaId === area.id);
                    const floorplan = floorplanData.find((f) => f.id === area.floorplanId) || {} as FloorplanType;
                    return (
                      <SortablePatrolAreaCard
                        key={area.id}
                        area={area}
                        floorplan={floorplan}
                        cardWidth={CARD_WIDTH}
                        cardHeight={CARD_HEIGHT}
                        index={index + 1}
                        rowIndex={Math.floor(index / COLUMNS)}
                        colIndex={index % COLUMNS}
                        isRTL={false}
                        isEndOfRow={index % COLUMNS === COLUMNS - 1}
                        isLast={index === selectedAreas.length - 1}
                        onRemove={handleRemoveArea}
                        minDwellTime={routeArea?.minDwellTime ?? 0}
                        maxDwellTime={routeArea?.maxDwellTime ?? 0}
                        onDwellChange={(id, field, value) => {
                          setFormData((prev) => ({
                            ...prev,
                            routeAreas: prev.routeAreas.map((r) =>
                              r.patrolAreaId === id ? { ...r, [field]: value } : r,
                            ),
                          }));
                        }}
                      />
                    );
                  })}

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      onClick={() => setAddAreaOpen(true)}
                      sx={{
                        height: CARD_HEIGHT,
                        width: CARD_WIDTH,
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
                </Grid>
              </SortableContext>
            </DndContext>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || formData.routeAreas.length < 2}
          >
            {isSaving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Area Dialog */}
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
                routeAreas: [
                  ...prev.routeAreas,
                  {
                    patrolAreaId: selectedAreaToAdd!,
                    minDwellTime: 0,
                    maxDwellTime: 0,
                  },
                ],
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
