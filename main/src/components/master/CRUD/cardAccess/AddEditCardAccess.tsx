import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  ClickAwayListener,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconInfoCircle, IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import toast from 'react-hot-toast';
import { CardAccessType } from 'src/store/apps/crud/cardAccess';
import { defaultCardAccessForm } from 'src/store/apps/defaultForm';
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';
import { TimeBlockType, TimeGroupType } from 'src/store/apps/crud/timeGroup';
import AreaHierarchySelector, { SelectedNode } from 'src/components/shared/AreaHierarchySelector';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// React Query hooks
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllTimeGroups } from 'src/hooks/useTimeGroup';
import { useAddCardAccess, useEditCardAccess } from 'src/hooks/useCardAccess';

interface FormType {
  type?: string;
  cardAccess?: CardAccessType;
}

const AddEditCardAccess = ({ type, cardAccess }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultCardAccessForm,
    ...cardAccess,
  });
  const [selectedAreaNode, setSelectedAreaNode] = useState<SelectedNode>(null);
  const [isTimeGroupOpen, setIsTimeGroupOpen] = useState(false);

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // React Query hooks for data fetching
  const { data: maskedAreas = [] } = useAllMaskedAreas();
  const { data: floors = [] } = useAllFloors();
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: buildings = [] } = useAllBuilding();
  const { data: timeGroup = [] } = useAllTimeGroups();

  // React Query mutations
  const addMutation = useAddCardAccess();
  const editMutation = useEditCardAccess();

  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && cardAccess) {
      setFormData({ ...defaultCardAccessForm, ...cardAccess });
    } else {
      setFormData({ ...defaultCardAccessForm });
    }
    setTimeout(() => {
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Card Access name is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setIsSaving(true);
    try {
      console.log('Data: ', formData);

      if (type === 'edit') {
        await editMutation.mutateAsync(formData);
        toast.success('Card Access updated successfully');
      } else {
        await addMutation.mutateAsync(formData);
        toast.success('Card Access created successfully');
      }

      handleClose();
    } catch (error) {
      console.error('Error saving Card Access:', error);
      toast.error('Saving Data Unsuccessful');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    console.log('Input Change:', { id, name, value });
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  // 1️⃣ Floorplans that actually have masked areas
  const floorplanIdsWithArea = React.useMemo(
    () => new Set(maskedAreas.map((ma) => ma.floorplanId)),
    [maskedAreas],
  );

  // 2️⃣ Floors that have at least one valid floorplan
  const floorIdsWithArea = React.useMemo(
    () =>
      new Set(floorplans.filter((fp) => floorplanIdsWithArea.has(fp.id)).map((fp) => fp.floorId)),
    [floorplans, floorplanIdsWithArea],
  );

  // 3️⃣ Buildings that have at least one valid floor
  const buildingIdsWithArea = React.useMemo(
    () => new Set(floors.filter((f) => floorIdsWithArea.has(f.id)).map((f) => f.buildingId)),
    [floors, floorIdsWithArea],
  );

  // 4️⃣ Final filtered data
  const filteredFloorplans = React.useMemo(
    () => floorplans.filter((fp) => floorplanIdsWithArea.has(fp.id)),
    [floorplans, floorplanIdsWithArea],
  );

  const filteredFloors = React.useMemo(
    () => floors.filter((f) => floorIdsWithArea.has(f.id)),
    [floors, floorIdsWithArea],
  );

  const filteredBuildings = React.useMemo(
    () => buildings.filter((b) => buildingIdsWithArea.has(b.id)),
    [buildings, buildingIdsWithArea],
  );

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Card Access">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Card Access">
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

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Card Access' : 'Edit Card Access'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 4, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.name}
                helperText={formErrors.name}
              />

              <CustomFormLabel htmlFor="remarks">Remarks</CustomFormLabel>
              <CustomTextField
                id="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.remarks}
                helperText={formErrors.remarks}
                multiline
                minRows={3}
                maxRows={5}
              />
            </Grid>
            <Grid
              size={{ lg: 4, md: 12, sm: 12 }}
              sx={{ display: 'flex', flexDirection: 'column' }}
            >
              <CustomFormLabel>Allowed Area(s)</CustomFormLabel>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Access
                </Typography>
                <RadioGroup
                  row
                  name="accessScope"
                  value={formData.accessScope ?? 'Specific'} // default "specific"
                  onChange={(e) => {
                    const scope = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      accessScope: scope,
                      maskedAreaIds: scope === 'Specific' ? prev.maskedAreaIds ?? [] : [], // clear if not specific
                    }));
                  }}
                >
                  <FormControlLabel value="All" control={<Radio />} label="All" />
                  <FormControlLabel value="Specific" control={<Radio />} label="Specific" />
                  <FormControlLabel value="None" control={<Radio />} label="None" />
                </RadioGroup>
              </Box>
              {formData.accessScope === 'Specific' && (
                <>
                  <AreaHierarchySelector
                    buildings={filteredBuildings}
                    floors={filteredFloors}
                    floorplans={filteredFloorplans}
                    maskedAreas={maskedAreas}
                    value={selectedAreaNode}
                    multiple={true}
                    highlightedAreaIds={formData.maskedAreaIds ?? []}
                    onChange={(node) => {
                      if (!node) return;

                      setSelectedAreaNode(null);

                      setFormData((prev) => {
                        let targetAreaIds: string[] = [];

                        if (node.type === 'area') {
                          targetAreaIds = [node.data.id];
                        } else if (node.type === 'floorplan') {
                          targetAreaIds = maskedAreas
                            .filter((ma) => ma.floorplanId === node.data.id)
                            .map((ma) => ma.id);
                        } else if (node.type === 'floor') {
                          const fpIds = floorplans
                            .filter((fp) => fp.floorId === node.data.id)
                            .map((fp) => fp.id);
                          targetAreaIds = maskedAreas
                            .filter((ma) => fpIds.includes(ma.floorplanId))
                            .map((ma) => ma.id);
                        } else if (node.type === 'building') {
                          const fIds = floors
                            .filter((f) => f.buildingId === node.data.id)
                            .map((f) => f.id);
                          const fpIds = floorplans
                            .filter((fp) => fIds.includes(fp.floorId))
                            .map((fp) => fp.id);
                          targetAreaIds = maskedAreas
                            .filter((ma) => fpIds.includes(ma.floorplanId))
                            .map((ma) => ma.id);
                        }

                        const currentAreas = prev.maskedAreaIds ?? [];
                        const allSelected =
                          targetAreaIds.length > 0 &&
                          targetAreaIds.every((id) => currentAreas.includes(id));

                        let updatedAreas: string[];
                        if (allSelected) {
                          updatedAreas = currentAreas.filter((id) => !targetAreaIds.includes(id));
                        } else {
                          const newAreas = targetAreaIds.filter((id) => !currentAreas.includes(id));
                          updatedAreas = [...currentAreas, ...newAreas];
                        }

                        return {
                          ...prev,
                          maskedAreaIds: updatedAreas,
                        };
                      });
                    }}
                  />

                  {/* Bordered list for selected areas */}
                  <Box
                    sx={{
                      mt: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      flexGrow: 1,
                      minHeight: 120,
                      maxHeight: 180,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {(formData.maskedAreaIds ?? []).length === 0 ? (
                      <Typography variant="body1" color="text.secondary">
                        Selected Area: None
                      </Typography>
                    ) : (
                      (formData.maskedAreaIds ?? []).map((id) => {
                        const ma = maskedAreas.find((m) => m.id === id);
                        if (!ma) return null;

                        const floor = floors.find((f) => f.id === ma.floorId);
                        const floorplan = floorplans.find((fp) => fp.id === ma.floorplanId);
                        const building = floor
                          ? buildings.find((b) => b.id === floor.buildingId)
                          : null;

                        return (
                          <Box
                            key={id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 0.5,
                              px: 1,
                              borderRadius: 0.5,
                              '&:hover': { bgcolor: 'grey.100' },
                            }}
                          >
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {ma.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {building?.name ?? 'Unknown Building'} &gt;{' '}
                                {floor?.name ?? 'Unknown Floor'} &gt;{' '}
                                {floorplan?.name ?? 'Unknown Floorplan'}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  maskedAreaIds: (prev.maskedAreaIds ?? []).filter(
                                    (fid) => fid !== id,
                                  ),
                                }))
                              }
                            >
                              ×
                            </IconButton>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </>
              )}
            </Grid>
            <Grid
              size={{ lg: 4, md: 12, sm: 12 }}
              sx={{ display: 'flex', flexDirection: 'column' }}
            >
              <CustomFormLabel>Allowed Time(s)</CustomFormLabel>

              <ClickAwayListener
                onClickAway={() => {
                  setIsTimeGroupOpen(false);
                }}
              >
                <Box>
                  <Autocomplete
                    multiple
                    open={isTimeGroupOpen}
                    disableCloseOnSelect
                    disablePortal
                    onOpen={() => {
                      setIsTimeGroupOpen(true);
                    }}
                    onClose={() => {
                      // Handled by ClickAwayListener
                    }}
                    options={timeGroup}
                    getOptionLabel={(option: TimeGroupType) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={timeGroup.filter((tg) => (formData.timeGroupIds ?? []).includes(tg.id))}
                    onChange={(_e, newValue) => {
                      setFormData((prev) => ({
                        ...prev,
                        timeGroupIds: newValue.map((tg) => tg.id),
                      }));
                      setIsTimeGroupOpen(true);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search time group..."
                        variant="outlined"
                        fullWidth
                        onFocus={() => {
                          setIsTimeGroupOpen(true);
                        }}
                      />
                    )}
                    renderTags={() => null}
                    renderOption={(props, option, { selected }) => {
                      const tooltipContent = (
                        <Box>
                          {option.timeBlocks?.length ? (
                            option.timeBlocks.map((tb) => (
                              <Typography key={tb.id} variant="caption" display="block" color="inherit">
                                {tb.dayOfWeek} : {tb.startTime} - {tb.endTime}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="caption" color="inherit">
                              No time blocks
                            </Typography>
                          )}
                        </Box>
                      );

                      return (
                        <li {...props} key={option.id}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            {/* Left side: name + description */}
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" fontWeight={600}>
                                {option.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.description ?? 'No description'}
                              </Typography>
                            </Box>

                            {/* Right side: Info button + Checkbox */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title={tooltipContent} arrow placement="left">
                                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                                  <IconInfoCircle size={16} />
                                </IconButton>
                              </Tooltip>
                              <Checkbox
                                icon={icon}
                                checkedIcon={checkedIcon}
                                checked={selected}
                                style={{ marginRight: 0 }}
                              />
                            </Box>
                          </Box>
                        </li>
                      );
                    }}
                  />
                </Box>
              </ClickAwayListener>

              {/* Bordered list for selected time groups */}
              <Box
                sx={{
                  mt: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                  flexGrow: 1,
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {(formData.timeGroupIds ?? []).length === 0 ? (
                  <Typography variant="body1" color="text.secondary">
                    Selected TimeGroup: None
                  </Typography>
                ) : (
                  (formData.timeGroupIds ?? []).map((id) => {
                    const tg = timeGroup.find((t: TimeGroupType) => t.id === id);
                    if (!tg) return null;

                    const tooltipContent = (
                      <Box>
                        {tg.timeBlocks?.length ? (
                          tg.timeBlocks.map((tb: TimeBlockType) => (
                            <Typography
                              key={tb.id}
                              variant="caption"
                              display="block"
                              color="inherit"
                            >
                              {tb.dayOfWeek} : {tb.startTime} - {tb.endTime}
                            </Typography>
                          ))
                        ) : (
                          <Typography variant="caption" color="inherit">
                            No time blocks
                          </Typography>
                        )}
                      </Box>
                    );

                    return (
                      <Box
                        key={id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.5,
                          px: 1,
                          borderRadius: 0.5,
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                      >
                        {/* Left side: name + desc */}
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {tg.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tg.description ?? 'No description'}
                          </Typography>
                        </Box>

                        {/* Right side: (i) info + (x) remove */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title={tooltipContent} arrow placement="top">
                            <IconButton size="small">
                              <IconInfoCircle size={16} />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                timeGroupIds: (prev.timeGroupIds ?? []).filter((fid) => fid !== id),
                              }))
                            }
                          >
                            ×
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ fontSize: '1rem', py: 1, px: 3 }}
            disabled={isSaving || addMutation.isPending || editMutation.isPending}
          >
            {isSaving || addMutation.isPending || editMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Save'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditCardAccess;
