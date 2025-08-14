import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Tooltip,
  Typography,
  Grid2 as Grid,
  Box,
  Autocomplete,
  TextField,
  Chip,
  MenuItem,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  IconButton,
  TableBody,
  Menu,
  Tab,
  TableContainer,
  Paper,
  Switch,
} from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/id';
import CustomClockInput from 'src/components/shared/CustomClockInput';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { TimeClockSlotProps } from '@mui/x-date-pickers/TimeClock';
import dayjs, { Dayjs } from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import utc from 'dayjs/plugin/utc';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchVisitorDT, sendInvitation, VisitorType } from 'src/store/apps/crud/visitor';
import { AppDispatch, RootState, useSelector } from 'src/store/Store';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import AddEditVisitor from 'src/components/master/CRUD/visitor/AddEditVisitor';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { DateTimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { defaultVisitorForm } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';

dayjs.extend(utc);
dayjs.extend(weekday);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.locale('id');
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

const VisitorRegister = () => {
  const dispatch: AppDispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const visitorList = useSelector((state: RootState) => state.visitorReducer.visitors);
  const members = useSelector((state: RootState) => state.memberReducer.memberAll);
  const buildingData = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floorData = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType[]>([]);
  const [selectedMember, setSelectedMember] = useState<memberType>({} as memberType);
  const [selectedMaskedArea, setSelectedMaskedArea] = useState<string | null>(null);

  const [searchVisitor, setSearchVisitor] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs());
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs());
  const [openMenu, setOpenMenu] = useState(false);

  const toUtcFormatted = (time: dayjs.Dayjs | null) => {
    return time?.utc().format('YYYY-MM-DDTHH:mm:ss.SSS');
  };

  const handleClickOpen = () => {
    setLoading(true);
    setSelectedVisitor([{ ...defaultVisitorForm, name: '', email: '' }]);
    setSelectedMaskedArea('');
    setSelectedMember({} as memberType);
    setSearchVisitor('');
    setNotes('');
    setStartTime(dayjs());
    setEndTime(dayjs());
    dispatch(fetchVisitorDT({ ...visitorFilter, length: 999 }));
    dispatch(fetchMembers());
    dispatch(fetchMaskedAreas());
    dispatch(fetchBuildings());
    dispatch(fetchFloors());
    dispatch(fetchFloorplan());
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setSaving(true);

    const startDate = toUtcFormatted(startTime);
    const endDate = toUtcFormatted(endTime);

    // Transform into backend's expected shape
    const payload = selectedVisitor.map((visitor) => ({
      Email: visitor.email,
      Name: visitor.name,
      isVip: visitor.isVip,
      MaskedAreaId: selectedMaskedArea,
      VisitorPeriodStart: startDate,
      VisitorPeriodEnd: endDate,
      PurposePerson: selectedMember.id,
      Agenda: notes,
    }));
    let result;
    try {
      result = await dispatch(sendInvitation(payload));
    } catch (error) {
      console.error('Invitation failed', error);
    }

    if (result && result.type && result.type.endsWith('/fulfilled')) {
      toast.success('Invitation sent successfully');
      setTimeout(() => {
        setLoading(false);
        setSaving(false);
        handleClose();
      }, 1000);
    } else {
      toast.error('Invitation failed');
    }

    setTimeout(() => {
      setLoading(false);
      setSaving(false);
    }, 1000);
  };

  const buildingHierarchy = buildNestedHierarchy(
    buildingData,
    floorData,
    floorplanData,
    maskedAreaData,
  );

  function getAreaPath(areaId: string | null): string {
    if (!areaId) return 'None';
    const area = maskedAreaData.find((a) => a.id === areaId);
    if (!area) return 'Unknown Area';

    const floorplan = floorplanData.find((fp) => fp.id === area.floorplanId);
    const floor = floorplan ? floorData.find((f) => f.id === floorplan.floorId) : null;
    const building = floor ? buildingData.find((b) => b.id === floor.buildingId) : null;

    const pathParts = [
      area.name,
      floorplan?.name ? `(${floorplan.name}` : '',
      floor?.name ? ` > ${floor.name}` : '',
      building?.name ? ` > ${building.name})` : '',
    ];

    return pathParts.filter(Boolean).join('');
  }
  function getSelectedAncestorIds(areaId: string | null): Set<string> {
    const ids = new Set<string>();
    if (!areaId) return ids;

    const area = maskedAreaData.find((a) => a.id === areaId);
    if (!area) return ids;

    ids.add(area.id);

    const floorplan = floorplanData.find((fp) => fp.id === area.floorplanId);
    if (floorplan) {
      ids.add(floorplan.id);
      const floor = floorData.find((f) => f.id === floorplan.floorId);
      if (floor) {
        ids.add(floor.id);
        const building = buildingData.find((b) => b.id === floor.buildingId);
        if (building) ids.add(building.id);
      }
    }

    return ids;
  }
  const selectedAncestorIds = getSelectedAncestorIds(selectedMaskedArea);

  // IDs of already-selected (registered) visitors
  const selectedIds = useMemo(
    () => new Set(selectedVisitor.filter((v) => !!v.id).map((v) => v.id as string)),
    [selectedVisitor],
  );

  // Only show visitors not yet selected
  const availableVisitors = useMemo(
    () => visitorList.filter((v) => !selectedIds.has(v.id)),
    [visitorList, selectedIds],
  );

  useEffect(() => {
    dispatch(fetchVisitorDT({ ...visitorFilter, length: 999, searchValue: searchVisitor }));
  }, [searchVisitor]);
  const isRegisteredVisitor = (visitor: VisitorType) => {
    return !!visitor.id; // registered visitors have a defined ID
  };
  const handleAddRow = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpenMenu(true);
  };
  const handleChangeVisitorField = (index: number, field: keyof VisitorType, value: string) => {
    setSelectedVisitor((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };
  const handleRemoveRow = (indexToRemove: number) => {
    setSelectedVisitor((prev) => prev.filter((_, index) => index !== indexToRemove));
  };
  const handleCloseMenu = () => {
    setOpenMenu(false);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Add Visitor">
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<IconPlus size={20} />}
          onClick={handleClickOpen}
        >
          Add Invitation
        </Button>
      </Tooltip>
      {!loading ? (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              Invite
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} alignItems={'flex-start'}>
              <Grid container size={7} height={'700px'}>
                {/* Time Input */}
                <Grid container size={12} spacing={2} px={3} mt={0}>
                  <Grid size={12}>
                    <CustomFormLabel> Visit Time </CustomFormLabel>
                  </Grid>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
                    {/* Start Time */}
                    <Grid size={6}>
                      <DateTimePicker
                        label="Start Time"
                        value={startTime}
                        onChange={setStartTime}
                        ampm={false}
                        format="ddd, DD - MMM - YYYY, HH:mm"
                        viewRenderers={{
                          hours: renderTimeViewClock,
                          minutes: renderTimeViewClock,
                          seconds: renderTimeViewClock,
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                          },
                        }}
                      />
                    </Grid>
                    {/* End Time */}
                    <Grid size={6}>
                      <DateTimePicker
                        label="End Time"
                        value={endTime}
                        onChange={setEndTime}
                        ampm={false}
                        format="ddd, DD - MMM - YYYY, HH:mm"
                        viewRenderers={{
                          hours: renderTimeViewClock,
                          minutes: renderTimeViewClock,
                          seconds: renderTimeViewClock,
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                          },
                        }}
                      />
                    </Grid>
                  </LocalizationProvider>
                </Grid>
                {/* Purpose Input */}
                <Grid container size={12} spacing={2} px={3} mb={2} mt={-2}>
                  {/* Notes Input */}

                  <CustomFormLabel>Area(s) to Visit</CustomFormLabel>
                  <div
                    style={{
                      border: '1px solid #ced4da',
                      borderRadius: 4,
                      padding: 8,
                      minHeight: 180,
                      maxHeight: 250,
                      background: '#fafbfc',
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                    }}
                  >
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <SimpleTreeView>
                        {buildingHierarchy.map((node) =>
                          renderTreeItems(
                            node,
                            selectedMaskedArea,
                            setSelectedMaskedArea,
                            selectedAncestorIds,
                          ),
                        )}
                      </SimpleTreeView>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Typography variant="body2">
                        Selected Area: {getAreaPath(selectedMaskedArea)}
                      </Typography>
                    </div>
                  </div>
                  {/* Member Input */}
                  <CustomFormLabel> Purpose Visit </CustomFormLabel>
                  <CustomSelect
                    name="selectedMember"
                    value={selectedMember?.id || ''}
                    onChange={(event: ChangeEvent<{ value: unknown }>) => {
                      const memberId = event.target.value;
                      const selected = members.find((m) => m.id === memberId);
                      setSelectedMember(selected || ({} as memberType));
                    }}
                    fullWidth
                    variant="outlined"
                  >
                    <MenuItem value="" disabled>
                      Select Member
                    </MenuItem>
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                  <CustomFormLabel> Notes </CustomFormLabel>
                  <CustomTextField
                    id="notes"
                    name="notes"
                    value={notes}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                    variant="outlined"
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={3}
                  />
                </Grid>
              </Grid>
              <Grid container size={5}>
                {/* Visitor Input */}
                <Grid container spacing={2} alignItems="flex-start" justifyContent="center">
                  <Grid>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                        width: '100%',
                        mb: 1,
                      }}
                    >
                      <Box sx={{ width: '100%', px: 3, pt: 2 }}>
                        <TableContainer
                          component={Paper}
                          sx={{ width: '100%', maxHeight: '650px' }}
                        >
                          <Table stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    width: '35%',
                                    top: 0,
                                    backgroundColor: '#fff', // or theme.palette.background.paper
                                    zIndex: 2,
                                  }}
                                >
                                  <Typography fontWeight={600}>Visitor Name</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    width: '35%',
                                    top: 0,
                                    backgroundColor: '#fff', // or theme.palette.background.paper
                                    zIndex: 2,
                                  }}
                                >
                                  <Typography fontWeight={600}>Visitor Email</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    width: 15,
                                    top: 0,
                                    backgroundColor: '#fff', // or theme.palette.background.paper
                                    zIndex: 2,
                                  }}
                                >
                                  <Typography fontWeight={600}>VIP</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    right: 0,
                                    width: 25,
                                    top: 0,
                                    backgroundColor: '#fff', // or theme.palette.background.paper
                                    zIndex: 2,
                                  }}
                                >
                                  <Tooltip title="Add row">
                                    <IconButton onClick={handleAddRow}>
                                      <IconPlus size={20} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedVisitor.map((visitor, index) => {
                                const isRegistered = isRegisteredVisitor(visitor);

                                return (
                                  <TableRow
                                    key={index}
                                    sx={{ backgroundColor: isRegistered ? '#f5f5f5' : 'inherit' }}
                                  >
                                    <TableCell>
                                      <TextField
                                        value={visitor.name || ''}
                                        onChange={(e) =>
                                          handleChangeVisitorField(index, 'name', e.target.value)
                                        }
                                        fullWidth
                                        disabled={isRegistered}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <TextField
                                        value={visitor.email || ''}
                                        onChange={(e) =>
                                          handleChangeVisitorField(index, 'email', e.target.value)
                                        }
                                        fullWidth
                                        disabled={isRegistered}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Switch
                                        checked={!!visitor.isVip}
                                        onChange={(e) =>
                                          handleChangeVisitorField(
                                            index,
                                            'isVip',
                                            e.target.checked as any,
                                          )
                                        }
                                        disabled={isRegistered}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip title="Delete row">
                                        <IconButton
                                          color="error"
                                          onClick={() => handleRemoveRow(index)}
                                        >
                                          <IconTrash size={20} />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              color="error"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
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
      ) : (
        <Dialog open={true} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: { maxHeight: 300, width: 300 },
        }}
      >
        {/* Sticky Add New Visitor */}
        <MenuItem
          onClick={() => {
            setSelectedVisitor([
              ...selectedVisitor,
              { ...defaultVisitorForm, name: '', email: '' },
            ]);
            handleCloseMenu();
          }}
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: '#f5f5f5',
            zIndex: 1,
            fontWeight: 'bold',
          }}
        >
          ➕ Add New Visitor
        </MenuItem>

        {/* Visitor List (filtered) */}
        {availableVisitors.map((v) => (
          <MenuItem
            key={v.id}
            onClick={() => {
              setSelectedVisitor((prev) => {
                // safety guard against double-add
                if (v.id && prev.some((p) => p.id === v.id)) return prev;

                // replace dummy single empty row if present
                if (prev.length === 1 && !prev[0].id && !prev[0].email && !prev[0].name) {
                  return [v];
                }
                return [...prev, v];
              });
              handleCloseMenu();
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {v.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {v.cardNumber || v.email}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default VisitorRegister;

type TreeNode = BuildingNode | FloorNode | FloorplanNode | AreaNode;

const renderTreeItems = (
  node: TreeNode,
  selectedMaskedArea: string | null,
  setSelectedMaskedArea: React.Dispatch<React.SetStateAction<string | null>>,
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
              setSelectedMaskedArea((prev) => (prev === node.id ? null : node.id));
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
