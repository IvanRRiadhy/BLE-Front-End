import {
  Box,
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
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import Checkbox from '@mui/material/Checkbox';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import QRCode from 'react-qr-code';
import StatusCard from 'src/components/apps/ecommerce/productAdd/Status';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { addCard, editCard, fetchCard, CardType } from 'src/store/apps/crud/card';
import { cardType } from 'src/types/crud/input';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { floorType, fetchFloors } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { MaskedAreaType, fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import toast from 'react-hot-toast';
import { defaultCardForm } from 'src/store/apps/defaultForm';
interface FormData {
  [key: string]: string | boolean | string[];
}
interface formType {
  type?: string;
  card?: CardType;
}
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
  const [qrOpen, setQrOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<{ [nodeId: string]: boolean }>({});
  const [formData, setFormData] = React.useState<FormData>({
    ...defaultCardForm,
    ...card,
  });
  const buildingData = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floorData = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const buildingHierarchy = buildNestedHierarchy(
    buildingData,
    floorData,
    floorplanData,
    maskedAreaData,
  );

  useEffect(() => {
    dispatch(fetchBuildings());
    dispatch(fetchFloors());
    dispatch(fetchFloorplan());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);

  const handleClickOpen = () => {
    if (type === 'edit' && card) {
      setFormData({ ...defaultCardForm, ...card });
    } else {
      setFormData({ ...defaultCardForm });
    }
    setOpen(true);
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
    try {
      const form = new FormData();
      Object.keys(formData).forEach((key) => {
        const value = formData[key];
        if (typeof value === 'boolean') {
          form.append(key, String(value)); // Convert boolean to string
        } else if (Array.isArray(value)) {
          form.append(key, JSON.stringify(value)); // Convert array to JSON string
        } else {
          form.append(key, value); // Value is already a string or Blob
        }
      });
      // form.append('isUsed', 'true');
      if (Array.isArray(formData.registeredArea) && formData.registeredArea.length > 1) {
        form.append('isMultiArea', 'true');
      } else {
        form.append('isMultiArea', 'false');
      }
      let result;
      if (type === 'edit') {
        result = await dispatch(editCard(form)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addCard(form));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchCard());
        console.log('Card Data Saved!');
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving card data:', error);
    }
  };

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
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between" m={2}>
            <Typography component="div" variant="h4" fontWeight={700}>
              {type === 'add' ? 'Add Card' : 'Edit Card'}
            </Typography>
            <Button variant="outlined" onClick={() => setQrOpen(true)}>
              Show QR Code
            </Button>
          </Box>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel>Card Details</CustomFormLabel>
              <CustomTextField
                id="name"
                name="name"
                label="Name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel>Card Information</CustomFormLabel>
              <CustomTextField
                id="remarks"
                name="remarks"
                placeholder={formData.remarks}
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
                placeholder={formData.dmac}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel>Card Number</CustomFormLabel>
              <CustomTextField
                id="cardNumber"
                name="cardNumber"
                placeholder={formData.cardNumber}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel>Card Type</CustomFormLabel>
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
              </CustomSelect>
              <CustomFormLabel>Registered Area for Returning</CustomFormLabel>
              <div
                style={{
                  border: '1px solid #ced4da',
                  borderRadius: 4,
                  padding: 8,
                  minHeight: 115,
                  maxHeight: 215,
                  overflowY: 'auto',
                  background: '#fafbfc',
                }}
              >
                {buildingHierarchy.map((building) =>
                  renderTreeNode(
                    building,
                    formData.registeredArea as string[],
                    setFormData,
                    expanded,
                    setExpanded,
                  ),
                )}
                <div style={{ marginTop: 8 }}>
                  {Array.isArray(formData.registeredArea) && formData.registeredArea.length > 0 && (
                    <Typography variant="body2">
                      Selected Area(s):{' '}
                      {formData.registeredArea
                        .map((areaId: string) => getAreaName(areaId))
                        .join(', ')}
                    </Typography>
                  )}
                </div>
              </div>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSave()}
            variant="contained"
            sx={{ fontSize: '1rem', py: 1, px: 3 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle m={2}>Card QR Code</DialogTitle>
        <Divider />
        <DialogContent
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}
        >
          {formData.cardNumber ? 
          (<QRCode value={formData.cardNumber.toString()} size={256} />) : 
          <Typography variant="body1">No QR Code</Typography>
          
          }
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={() => setQrOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditCard;

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
type TreeNode = BuildingNode | FloorNode | FloorplanNode | AreaNode;
function isBuilding(node: TreeNode): node is BuildingNode {
  return node.nodeType === 'building';
}
function isFloor(node: TreeNode): node is FloorNode {
  return node.nodeType === 'floor';
}
function isFloorplan(node: TreeNode): node is FloorplanNode {
  return node.nodeType === 'floorplan';
}
function isArea(node: TreeNode): node is AreaNode {
  return node.nodeType === 'area';
}

function getAllMaskedAreaIdsUnder(node: TreeNode) {
  // node can be Building, Floor, or Floorplan
  if ('maskedAreas' in node && Array.isArray(node.maskedAreas)) {
    return node.maskedAreas.map((a) => a.id);
  }
  let ids: string[] = [];
  if (node.floors) {
    node.floors.forEach((floor) => {
      ids = ids.concat(getAllMaskedAreaIdsUnder(floor));
    });
  }
  if (node.floorplans) {
    node.floorplans.forEach((fp) => {
      ids = ids.concat(getAllMaskedAreaIdsUnder(fp));
    });
  }
  return ids;
}

// For Area, just return [node.id]
function getMaskedAreaIds(node: TreeNode) {
  if ('maskedAreas' in node || node.floors || node.floorplans)
    return getAllMaskedAreaIdsUnder(node);
  return [node.id];
}

function isParentChecked(node: TreeNode, selectedIds: string[]) {
  // Checked if ALL maskedAreas under this node are selected
  const allIds = getAllMaskedAreaIdsUnder(node);
  return allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
}

function isParentIndeterminate(node: TreeNode, selectedIds: string[]) {
  // Indeterminate if SOME (but not all) maskedAreas under this node are selected
  const allIds = getAllMaskedAreaIdsUnder(node);
  return (
    allIds.length > 0 &&
    !allIds.every((id) => selectedIds.includes(id)) &&
    allIds.some((id) => selectedIds.includes(id))
  );
}

function renderTreeNode(
  node: TreeNode,
  selectedIds: string[],
  setFormData: React.Dispatch<React.SetStateAction<any>>,
  expanded: { [nodeId: string]: boolean },
  setExpanded: React.Dispatch<React.SetStateAction<{ [nodeId: string]: boolean }>>,
) {
  // "node" can be building, floor, floorplan, or maskedArea
  // Each node may have children as .floors, .floorplans, or .maskedAreas
  const hasChildren = node.floors || node.floorplans || node.maskedAreas;

  let children: TreeNode[] = [];
  if (isBuilding(node)) children = node.floors;
  else if (isFloor(node)) children = node.floorplans;
  else if (isFloorplan(node)) children = node.maskedAreas;

  const isArea = !hasChildren;

  // checked/indeterminate for parent
  const checked = isArea ? selectedIds.includes(node.id) : isParentChecked(node, selectedIds);

  const indeterminate = !isArea && isParentIndeterminate(node, selectedIds);
  const isExpanded = !!expanded[node.id];
  return (
    <div key={node.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          cursor: 'pointer',
          padding: '2px 0',
          background: checked ? '#e6f4ea' : 'inherit',
        }}
        onClick={() => {
          // Only toggle children on checkbox click, not label click
        }}
      >
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          size="small"
          style={{ marginRight: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            const allIds = isArea ? [node.id] : getAllMaskedAreaIdsUnder(node);
            setFormData((prev: any) => {
              let areas = Array.isArray(prev.registeredArea) ? [...prev.registeredArea] : [];
              if (checked) {
                // Uncheck all below
                areas = areas.filter((id) => !allIds.includes(id));
              } else {
                // Check all below
                allIds.forEach((id) => {
                  if (!areas.includes(id)) areas.push(id);
                });
              }
              return { ...prev, registeredArea: areas };
            });
          }}
        />
        <span
          style={{ flex: 1, cursor: 'pointer', userSelect: 'none', fontWeight: isArea ? 400 : 500 }}
          onClick={(e) => {
            e.stopPropagation();
            if (isArea) {
              // Toggle selection (just like checkbox)
              setFormData((prev: any) => {
                let areas = Array.isArray(prev.registeredArea) ? [...prev.registeredArea] : [];
                if (areas.includes(node.id)) {
                  areas = areas.filter((id) => id !== node.id);
                } else {
                  areas.push(node.id);
                }
                return { ...prev, registeredArea: areas };
              });
            } else if (hasChildren) {
              // Toggle expand/collapse
              setExpanded((prev) => ({
                ...prev,
                [node.id]: !prev[node.id],
              }));
            }
          }}
        >
          {node.name}
        </span>

        {hasChildren && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => ({
                ...prev,
                [node.id]: !prev[node.id],
              }));
            }}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingLeft: 8 }}
          >
            {isExpanded ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div style={{ marginLeft: 24 }}>
          {children.map((child) =>
            renderTreeNode(child, selectedIds, setFormData, expanded, setExpanded),
          )}
        </div>
      )}
    </div>
  );
}
