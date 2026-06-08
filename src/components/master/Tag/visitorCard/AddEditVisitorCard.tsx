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
import {
  addVisitorCard,
  editVisitorCard,
  fetchVisitorCard,
  VisitorCardType,
} from 'src/store/apps/crud/visitorCard';
import { cardType } from 'src/types/crud/input';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { floorType, fetchFloors } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { MaskedAreaType, fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
interface FormData {
  [key: string]: string | boolean | string[];
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
interface formType {
  type?: string;
  visitorCard?: VisitorCardType;
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

const AddEditVisitorCard = ({ type, visitorCard }: formType) => {
  const dispatch: AppDispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<{ [nodeId: string]: boolean }>({});
  const [formData, setFormData] = React.useState<FormData>({
    id: visitorCard?.id || '',
    name: visitorCard?.name || '',
    cardType: visitorCard?.cardType || '',
    number: visitorCard?.number || '',
    qrCode: visitorCard?.qrCode || '',
    mac: visitorCard?.mac || '',
    siteId: visitorCard?.siteId || '',
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
    // dispatch(fetchMaskedAreas());
  }, [dispatch]);
  const handleClickOpen = () => {
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
              {type === 'add' ? 'Add Visitor Card' : 'Edit Visitor Card'}
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
              <CustomFormLabel>Mac</CustomFormLabel>
              <CustomTextField
                id="mac"
                name="mac"
                placeholder={formData.mac}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel>Card Number</CustomFormLabel>
              <CustomTextField
                id="number"
                name="number"
                placeholder={formData.number}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddEditVisitorCard;
