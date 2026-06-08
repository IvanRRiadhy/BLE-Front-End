import { BASE_URL } from 'src/utils/axios';
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
  FormHelperText,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplanDT } from 'src/store/apps/crud/floorplan';
import toast from 'react-hot-toast';
import { defaultFloorplanForm } from 'src/store/apps/defaultForm';
import { EngineType, fetchEngines } from 'src/store/apps/crud/engine';
import { useAddFloorplan, useEditFloorplan } from 'src/hooks/useFloorplan';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllEngines } from 'src/hooks/useEngine';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { useUploadCDN } from 'src/hooks/usePatrolCase';
import AreaHierarchySelector, { SelectedNode } from 'src/components/shared/AreaHierarchySelector';
import { useAllBuilding } from 'src/hooks/useBuilding';

interface FormType {
  type?: string;
  floorplan?: FloorplanType;
  fixedFloorId?: string;
  trigger?: (onClick: () => void) => React.ReactNode;
}

const AddEditFloorplan = ({ type, floorplan, fixedFloorId, trigger }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(floorplan?.floorplanImage || null);
  const [formData, setFormData] = React.useState({
    ...defaultFloorplanForm,
    ...floorplan,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const addMutation = useAddFloorplan();
  const editMutation = useEditFloorplan();
  const uploadMutation = useUploadCDN();

  const getCdnUrl = (url?: string | null) => {
    if (!url) return '';
    // console.log("URL: ", url)
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
  };

  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  const dispatch: AppDispatch = useDispatch();
  // useEffect(() => {
  //   dispatch(fetchFloors());
  //   dispatch(fetchEngines());
  //   // console.log(formData);
  // }, [dispatch]);

  const { data: floorData = [], isLoading: floorLoading } = useAllFloors();
  const { data: buildingData = [] } = useAllBuilding();
  const { data: engineData = [], isLoading: engineLoading } = useAllEngines();

  const filteredBuildings = React.useMemo(() => {
    const buildingIdsWithFloors = new Set(floorData.map((f) => f.buildingId));
    return buildingData.filter((b) => buildingIdsWithFloors.has(b.id));
  }, [buildingData, floorData]);

  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && floorplan) {
      if (!floorplan.id) {
        dispatch(fetchFloorplanDT(floorplanFilter));
      }
      setFormData({ ...defaultFloorplanForm, ...floorplan });
    } else {
      setFormData({
        ...defaultFloorplanForm,
        floorId: fixedFloorId || '',
      });
    }
    setTimeout(() => {
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
    setImage(null);
    setPreview(floorplan?.floorplanImage || null);
  };
  /* useEffect(() => {
    // Only run for edit mode and if floorplanImage is a string path
    if (
      type === 'edit' &&
      open &&
      floorplan?.floorplanImage &&
      typeof floorplan.floorplanImage === 'string'
    ) {
      // Fetch the image from the server
      // console.log("fetching floorplan image");
      fetch(`${BASE_URL}${floorplan.floorplanImage}`)
        .then((res) => res.blob())
        .then((blob) => {
          // Create a File object from the Blob
          const file = new File(
            [blob],
            floorplan.floorplanImage.split('/').pop() || 'floorplan.jpg',
            {
              type: blob.type,
            },
          );
          setImage(file);
          // Optionally set preview as well
          setPreview(URL.createObjectURL(file));
        })
        .catch((err) => {
          console.error('Failed to fetch floorplan image:', err);
        });
    }
    // eslint-disable-next-line
  }, [open]); */

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Floorplan name is required';
    if (!formData.floorId?.trim()) errors.floorId = 'Floor is required';
    
    // Old validation:
    // if (!image) errors.floorplanImage = 'Floor Image is required';
    
    // New CDN validation (requires either a new local image selected or an existing URL string)
    if (!image && !formData.floorplanImage) errors.floorplanImage = 'Floor Image is required';
    
    if (!formData.floorX) errors.floorX = 'Floor Length is required';
    if (!formData.floorY) errors.floorY = 'Floor Width is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);

    let finalImageUrl = formData.floorplanImage;

    // If there is a new image selected, upload to CDN first
    if (image) {
      const uploadData = new FormData();
      uploadData.append('file', image);

      try {
        const uploadRes = await uploadMutation.mutateAsync(uploadData);
        const uploaded = uploadRes?.collection?.data?.[0];
        if (!uploaded || !uploaded.fileUrl) {
          throw new Error('Invalid response from CDN upload');
        }
        finalImageUrl = uploaded.fileUrl;
      } catch (err) {
        console.error('CDN upload failed:', err);
        toast.error('Failed to uploading image.');
        setIsSaving(false);
        return; // Aborts saving, keeps dialog open
      }
    }

    // Comment out original file-upload logic:
    /*const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (!['floorplanImage', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'].includes(key)) {
        data.append(key, value?.toString() ?? '');
      }
    });
    if (image) data.append('floorplanImage', image);
    */

    // New logic: Construct FormData using the CDN URL string
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (!['createdBy', 'createdAt', 'updatedBy', 'updatedAt'].includes(key)) {
        if (key === 'floorplanImage') {
          data.append('floorplanImage', finalImageUrl || '');
        } else {
          data.append(key, value?.toString() ?? '');
        }
      }
    });

    try {
      if (type === 'add') {
        await addMutation.mutateAsync(data);
        toast.success('Floorplan added successfully!');
      } else {
        await editMutation.mutateAsync(data);
        toast.success('Floorplan updated successfully!');
      }
      handleClose();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save floorplan.');
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
    // console.log('Input Change:', { id, name, value });
    const key = id || name;

    // Prepare new value for the field being changed
    const newValue = value;
    setFormData((prev) => {
      // Prepare updated values for calculation
      const updated = { ...prev, [key]: newValue };

      // Only recalculate if floorX, floorY, pixelX, and pixelY are available
      let meterPerPx = prev.meterPerPx;
      if (key === 'floorX' || key === 'floorY') {
        const floorX = Number(key === 'floorX' ? newValue : updated.floorX) || 0;
        const floorY = Number(key === 'floorY' ? newValue : updated.floorY) || 0;
        const pixelX = Number(updated.pixelX) || 0;
        const pixelY = Number(updated.pixelY) || 0;
        if (pixelX && pixelY && floorX && floorY) {
          meterPerPx = (floorX / pixelX + floorY / pixelY) / 2;
        }
      }
      // console.log('Updated Form Data:', updated);
      return {
        ...updated,
        meterPerPx,
      };
    });
  };
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (['image/png'].includes(file.type)) {
        setImage(file);
        const prepreview = URL.createObjectURL(file);
        // console.log(prepreview);
        setPreview(prepreview); // Preview selected image
        // console.log(image);
        // Calculate image dimensions
        const img = new window.Image();
        img.onload = () => {
          const pixelX = img.width;
          const pixelY = img.height;
          // Calculate meterPerPx if floorX and floorY are set
          const floorX = Number(formData.floorX) || 0;
          const floorY = Number(formData.floorY) || 0;
          let meterPerPx = 0;
          if (pixelX && pixelY && floorX && floorY) {
            meterPerPx = (floorX / pixelX + floorY / pixelY) / 2;
          }
          setFormData((prev) => ({
            ...prev,
            pixelX,
            pixelY,
            meterPerPx,
          }));
        };
        img.src = prepreview;
      } else {
        alert('Please select a valid image file PNG');
      }
    }
  };

  const selectedFloorNode = React.useMemo<SelectedNode>(() => {
    if (!formData.floorId) return null;
    const floor = floorData.find((f) => f.id === formData.floorId);
    if (!floor) return null;
    return { type: 'floor', data: floor };
  }, [formData.floorId, floorData]);

  const engineOptions = engineData.map((e) => ({
    label: e.name,
    id: e.id,
  }));

  return (
    <>
      {trigger ? (
        trigger(handleClickOpen)
      ) : type === 'edit' ? (
        <Tooltip title="Edit Floorplan">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      ) : type === 'add' ? (
        <Tooltip title="Add Floorplan">
          <Button
            variant="contained"
            color="primary"
            sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            onClick={handleClickOpen}
          >
            <IconPlus size={20} />
          </Button>
        </Tooltip>
      ) : null}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Floorplan' : 'Edit Floorplan'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="floorplan-Name">Floorplan Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
              <CustomFormLabel htmlFor="floorX">Floor Length (in meters)</CustomFormLabel>
              <CustomTextField
                id="floorX"
                value={formData.floorX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ step: 'any' }}
                error={!!formErrors.floorX}
                helperText={formErrors.floorX}
              />
              {/* <CustomFormLabel htmlFor="Engine-id">Engine</CustomFormLabel>
              <CustomAutocomplete
                label="Engine"
                options={engineOptions}
                value={engineOptions.find((e) => e.id === formData.engineId) || null}
                onChange={(val) => setFormData((prev) => ({ ...prev, engineId: val?.id ?? '' }))}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                loading={engineLoading}
                sx={{ width: '100%' }}
              /> */}
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              {/* <CustomFormLabel htmlFor="floor-id">Floor</CustomFormLabel> */}
              <CustomFormLabel htmlFor="floor-id">Floor</CustomFormLabel>
              <AreaHierarchySelector
                buildings={filteredBuildings}
                floors={floorData}
                floorplans={[]}
                maskedAreas={[]}
                value={selectedFloorNode}
                onChange={(val: SelectedNode) => {
                  const id = val?.data?.id ?? '';
                  setFormData((prev) => ({ ...prev, floorId: id }));
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.floorId;
                    return next;
                  });
                }}
                error={!!formErrors.floorId}
                helperText={formErrors.floorId}
                exclusive="floor"
                disabled={!!fixedFloorId}
                label="Floor"
              />

              <CustomFormLabel htmlFor="floorY">Floor Width (in meters)</CustomFormLabel>
              <CustomTextField
                id="floorY"
                value={formData.floorY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ step: 'any' }}
                error={!!formErrors.floorY}
                helperText={formErrors.floorY}
              />
            </Grid>
            <Grid size={{ lg: 12, md: 12, sm: 12 }}>
              <Grid size={12}>
                <CustomFormLabel htmlFor="fp-image" error={!!formErrors.floorplanImage}>
                  Floorplan Image
                </CustomFormLabel>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleImageChange}
                  required
                  style={{
                    border: formErrors.floorplanImage ? '1px solid red' : undefined,
                    padding: '6px',
                    borderRadius: '4px',
                    width: '100%',
                    marginTop: '5px',
                  }}
                />
                {formErrors.floorplanImage && (
                  <FormHelperText error>{formErrors.floorplanImage}</FormHelperText>
                )}
                {preview && (
                  <>
                    {/* Old image tag using BASE_URL (kept as comment):
                    <img
                      src={preview?.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
                      alt="Floorplan Preview"
                      style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                    />
                    */}
                    {/* New image tag using CDN URL */}
                    <img
                      src={preview?.startsWith('blob:') ? preview : getCdnUrl(preview)}
                      alt="Floorplan Preview"
                      style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                    />

                    {/* Pixel Dimensions */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1, textAlign: 'center', fontStyle: 'italic' }}
                    >
                      Image Size: {formData.pixelX || 0}px × {formData.pixelY || 0}px
                    </Typography>
                  </>
                )}
              </Grid>
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
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* {isLoading && (
        <Dialog open={open} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )} */}
    </>
  );
};

export default AddEditFloorplan;
