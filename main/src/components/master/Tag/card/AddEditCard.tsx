import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import Checkbox from '@mui/material/Checkbox';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import QRCode from 'react-qr-code';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { CardType } from 'src/store/apps/crud/card';
import { cardType } from 'src/types/crud/input';
import { BuildingType } from 'src/store/apps/crud/building';
import { floorType } from 'src/store/apps/crud/floor';
import { FloorplanType } from 'src/store/apps/crud/floorplan';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import toast from 'react-hot-toast';
import { defaultCardForm } from 'src/store/apps/defaultForm';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { CardAccessType } from 'src/store/apps/crud/cardAccess';
import { useAddCard, useEditCard } from 'src/hooks/useCard';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllCardAccess } from 'src/hooks/useCardAccess';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';

interface formType {
  type?: string;
  card?: CardType;
}

type AreaNode = MaskedAreaType & {
  nodeType: 'area';
  maskedAreas?: never;
  floors?: never;
  floorplans?: never;
};

type FloorplanNode = FloorplanType & {
  nodeType: 'floorplan';
  maskedAreas: AreaNode[];
  floorplans?: never;
  floors?: never;
};

type FloorNode = floorType & {
  nodeType: 'floor';
  floorplans: FloorplanNode[];
  maskedAreas?: never;
  floors?: never;
};

type BuildingNode = BuildingType & {
  nodeType: 'building';
  floors: FloorNode[];
  maskedAreas?: never;
  floorplans?: never;
};

function buildNestedHierarchy(
  buildings: BuildingType[],
  floors: floorType[],
  floorplans: FloorplanType[],
  maskedAreas: MaskedAreaType[],
): BuildingNode[] {
  const floorsByBuilding = floors.reduce((acc, f) => {
    (acc[f.buildingId] ||= []).push(f);
    return acc;
  }, {} as Record<string, floorType[]>);

  const floorplansByFloor = floorplans.reduce((acc, fp) => {
    (acc[fp.floorId] ||= []).push(fp);
    return acc;
  }, {} as Record<string, FloorplanType[]>);

  const areasByFloorplan = maskedAreas.reduce((acc, a) => {
    (acc[a.floorplanId] ||= []).push(a);
    return acc;
  }, {} as Record<string, MaskedAreaType[]>);

  return buildings
    .map((b) => {
      const floorsArr = (floorsByBuilding[b.id] || [])
        .map((f) => {
          const floorplansArr = (floorplansByFloor[f.id] || [])
            .map((fp) => {
              const maskedAreasArr = (areasByFloorplan[fp.id] || []).map((a) => ({
                ...a,
                nodeType: 'area' as const,
              }));
              if (!maskedAreasArr.length) return null;
              return { ...fp, nodeType: 'floorplan' as const, maskedAreas: maskedAreasArr };
            })
            .filter(Boolean) as FloorplanNode[];
          if (!floorplansArr.length) return null;
          return { ...f, nodeType: 'floor' as const, floorplans: floorplansArr };
        })
        .filter(Boolean) as FloorNode[];
      if (!floorsArr.length) return null;
      return { ...b, nodeType: 'building' as const, floors: floorsArr };
    })
    .filter(Boolean) as BuildingNode[];
}

const AddEditCard = ({ type, card }: formType) => {
  const dispatch: AppDispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<{ [nodeId: string]: boolean }>({});
  const [formData, setFormData] = React.useState<CardType>({
    ...defaultCardForm,
    ...card,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // React Query hooks for data fetching
  const { data: buildingData = [] } = useAllBuilding();
  const { data: floorData = [] } = useAllFloors();
  const { data: floorplanData = [] } = useAllFloorplans();
  const { data: maskedAreaData = [] } = useAllMaskedAreas();
  // const { data: cardGroupData = [] } = useAllCardGroups();
  const { data: cardAccessData = [] } = useAllCardAccess();

  // React Query mutations
  const addMutation = useAddCard();
  const editMutation = useEditCard();

  const buildingHierarchy = buildNestedHierarchy(
    buildingData,
    floorData,
    floorplanData,
    maskedAreaData,
  );

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && card) {
      setFormData({ ...defaultCardForm, ...card });
    } else {
      setFormData({ ...defaultCardForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  const getAreaName = (areaId: string) => {
    const area = maskedAreaData.find((area: MaskedAreaType) => area.id === areaId);
    return area ? area.name : 'Unknown area';
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // shape what the API expects
      const payload = {
        ...formData,
        // ensure boolean + clear single area if multi-area is ON
        isMultiMaskedArea: !!formData.isMultiMaskedArea,
        registeredMaskedAreaId: formData.isMultiMaskedArea
          ? null
          : formData.registeredMaskedAreaId ?? null,
      };

      if (type === 'edit') {
        await editMutation.mutateAsync(payload);
        toast.success('Card updated successfully');
      } else {
        await addMutation.mutateAsync(payload);
        toast.success('Card added successfully');
      }

      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Saving Data Unsuccessful');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  function getAreaPath(areaId: string): string {
    if (!areaId) return 'None';
    const area = maskedAreaData.find((a: MaskedAreaType) => a.id === areaId);
    if (!area) return 'Unknown Area';

    const floorplan = floorplanData.find((fp: FloorplanType) => fp.id === area.floorplanId);
    const floor = floorplan ? floorData.find((f: floorType) => f.id === floorplan.floorId) : null;
    const building = floor
      ? buildingData.find((b: BuildingType) => b.id === floor.buildingId)
      : null;

    const pathParts = [
      area.name,
      floorplan?.name ? `(${floorplan.name}` : '',
      floor?.name ? ` > ${floor.name}` : '',
      building?.name ? ` > ${building.name})` : '',
    ];

    return pathParts.filter(Boolean).join('');
  }

  function getSelectedAncestorIds(areaId: string): Set<string> {
    const ids = new Set<string>();
    if (!areaId) return ids;

    const area = maskedAreaData.find((a: MaskedAreaType) => a.id === areaId);
    if (!area) return ids;

    ids.add(area.id);

    const floorplan = floorplanData.find((fp) => fp.id === area.floorplanId);
    if (floorplan) {
      ids.add(floorplan.id);
      const floor = floorData.find((f) => f.id === floorplan.floorId);
      if (floor) {
        ids.add(floor.id);
        const building = buildingData.find((b: BuildingType) => b.id === floor.buildingId);
        if (building) ids.add(building.id);
      }
    }

    return ids;
  }

  const selectedAncestorIds = getSelectedAncestorIds(formData.registeredMaskedAreaId ?? '');

  const setRegisteredArea: React.Dispatch<React.SetStateAction<string>> = (value) => {
    setFormData((prev) => {
      const next =
        typeof value === 'function'
          ? (value as (p: string) => string)(prev.registeredMaskedAreaId ?? '')
          : value;
      return { ...prev, registeredMaskedAreaId: next };
    });
  };

  // useEffect(() => {
  //   console.log("Form Data Changed:", formData);
  // }, [formData]);

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Card">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Card">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Card
          </Button>
        </Tooltip>
      )}
      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between" m={2}>
              <Typography component="div" variant="h4" fontWeight={700}>
                {type === 'add' ? 'Add Card' : 'Edit Card'}
              </Typography>
              {/* <Button variant="outlined" onClick={() => setQrOpen(true)}>
                Show QR Code
              </Button> */}
            </Box>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel>Card Details</CustomFormLabel>
                <CustomTextField
                  id="name"
                  name="name"
                  label="Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel>Card Information</CustomFormLabel>
                <CustomTextField
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  variant="outlined"
                  minRows={3}
                  maxRows={3}
                />
                <CustomFormLabel>Mac</CustomFormLabel>
                <CustomTextField
                  id="dmac"
                  name="dmac"
                  value={formData.dmac}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel>Card Number</CustomFormLabel>
                <CustomTextField
                  id="cardNumber"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              {/* <Grid size={{ lg: 4.5, md: 12, sm: 12 }}> */}
                {/* <CustomFormLabel>Card Type</CustomFormLabel>
                <CustomSelect
                  id="cardType"
                  name="cardType"
                  value={formData.cardType}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                >
                  {cardType.map((item) => (
                    <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                      {item.label}
                    </MenuItem>
                  ))}
                </CustomSelect> */}
                {/* <CustomFormLabel>Registered Area for Returning</CustomFormLabel> */}

                {/* <FormControlLabel
                  sx={{ mb: 1 }}
                  control={
                    <Switch
                      checked={formData.isMultiMaskedArea}
                      onChange={(_, checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          isMultiMaskedArea: checked,
                          registeredMaskedAreaId: checked ? '' : prev.registeredMaskedAreaId,
                        }));
                      }}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {formData.isMultiMaskedArea ? 'Multi-Area' : 'Single-Area'}
                      </Typography>
                      <Tooltip
                        title={
                          formData.isMultiMaskedArea
                            ? 'Card can be returned in any area'
                            : 'Card can only be returned to the selected area below'
                        }
                        arrow
                        placement="top"
                      >
                        <Box
                          sx={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: 'transparent',
                            color: '#000',
                            border: '1px solid #000',
                            borderColor: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          ?
                        </Box>
                      </Tooltip>
                    </Box>
                  }
                /> */}

                {/* {!formData.isMultiMaskedArea && (
                  <div
                    style={{
                      marginTop: 8,
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      padding: 8,
                      flexGrow: 1,
                      background: 'background.paper',
                      display: 'flex',
                      minHeight: 258,
                      flexDirection: 'column',
                      width: '100%',
                    }}
                  >
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <SimpleTreeView>
                        {buildingHierarchy.map((node) =>
                          renderTreeItems(
                            node,
                            formData.registeredMaskedAreaId ?? '',
                            setRegisteredArea,
                            selectedAncestorIds,
                          ),
                        )}
                      </SimpleTreeView>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Typography variant="body2">
                        Selected Area: {getAreaPath(formData.registeredMaskedAreaId ?? '')}
                      </Typography>
                    </div>
                  </div>
                )} */}
              {/* </Grid> */}
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                {/* <CustomFormLabel>Card Group (--WIP--)</CustomFormLabel>
                <CustomSelect
                  id="cardType"
                  name="cardType"
                  value={formData.cardType}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                >
                  {cardType.map((item) => (
                    <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                      {item.label}
                    </MenuItem>
                  ))}
                </CustomSelect> */}
                <CustomFormLabel>Card Access</CustomFormLabel>

                <CustomAutocomplete<CardAccessType>
                  label="Select Card Access"
                  options={cardAccessData.filter(
                    (ca) =>
                      !(formData.cardAccesses ?? []).some(
                        (fca: CardAccessType) => fca.id === ca.id,
                      ),
                  )}
                  value={null} // always null so user can add repeatedly
                  onChange={(item) => {
                    if (!item) return;
                    setFormData((prev) => ({
                      ...prev,
                      cardAccessIds: [...(prev.cardAccessIds ?? []), item.id],
                      cardAccesses: [...(prev.cardAccesses ?? []), item],
                    }));
                  }}
                  getOptionLabel={(o) => o?.name ?? ''}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  // placeholder="Select a Card Access"
                />

                <Box
                  sx={{
                    mt: 1,
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    display: 'flex',
                    minHeight: 258,
                    flexDirection: 'column',
                    bgcolor: 'background.default',
                  }}
                >
                  {(formData.cardAccesses ?? []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Selected Access: None
                    </Typography>
                  ) : (
                    (formData.cardAccesses ?? []).map((ca: any) => (
                      <Box
                        key={ca.id}
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
                        <Typography variant="body2">{ca.name}</Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              cardAccessIds: (prev.cardAccessIds ?? []).filter(
                                (fca: any) => fca !== ca.id,
                              ),
                              cardAccesses: (prev.cardAccesses ?? []).filter(
                                (fca: any) => fca.id !== ca.id,
                              ),
                            }))
                          }
                        >
                          ×
                        </IconButton>
                      </Box>
                    ))
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave()}
              variant="contained"
              disabled={loading}
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {/* <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle m={2}>Card QR Code</DialogTitle>
        <Divider />
        <DialogContent
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}
        >
          {formData.cardNumber ? (
            <QRCode value={formData.cardNumber.toString()} size={256} />
          ) : (
            <Typography variant="body1">No QR Code</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={() => setQrOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog> */}
      {loading && (
        <Dialog open={true} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditCard;

type TreeNode = BuildingNode | FloorNode | FloorplanNode | AreaNode;

const renderTreeItems = (
  node: TreeNode,
  selectedMaskedArea: string,
  setSelectedMaskedArea: React.Dispatch<React.SetStateAction<string>>,
  selectedAncestorIds: Set<string>,
): React.ReactNode => {
  const isLeaf = node.nodeType === 'area';
  const isSelected = isLeaf && selectedMaskedArea === node.id;
  const isAncestor = selectedAncestorIds.has(node.id);

  let children: TreeNode[] = [];
  if ('floors' in node && node.floors) children = node.floors;
  else if ('floorplans' in node && node.floorplans) children = node.floorplans;
  else if ('maskedAreas' in node && node.maskedAreas) children = node.maskedAreas;

  return (
    <TreeItem
      key={node.id}
      itemId={node.id}
      label={
        <Typography
          variant="body2"
          sx={{
            fontWeight: isLeaf ? 400 : 500,
            fontSize: isLeaf ? '0.875rem' : '0.875rem',
            color: isSelected ? 'primary.main' : isAncestor ? 'secondary.main' : 'inherit',
            cursor: isLeaf ? 'pointer' : 'default',
            backgroundColor: isSelected || isAncestor ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            borderRadius: 1,
            px: 0.5,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isLeaf) {
              setSelectedMaskedArea((prev) => (prev === node.id ? '' : node.id));
            }
          }}
        >
          {node.name}
        </Typography>
      }
    >
      {children.length > 0 &&
        children.map((child) =>
          renderTreeItems(child, selectedMaskedArea, setSelectedMaskedArea, selectedAncestorIds),
        )}
    </TreeItem>
  );
};
