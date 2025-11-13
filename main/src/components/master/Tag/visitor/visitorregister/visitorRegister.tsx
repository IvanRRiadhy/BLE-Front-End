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
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { TimeClockSlotProps } from '@mui/x-date-pickers/TimeClock';
import dayjs, { Dayjs } from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import utc from 'dayjs/plugin/utc';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DateTimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { defaultVisitorForm } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';

// Import React Query hooks
import { useSendInvitation } from 'src/hooks/useVisitorTrx';
import { useVisitorList } from 'src/hooks/useVisitor';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';

// Import types
import { VisitorType } from 'src/store/apps/crud/visitor';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { BuildingType } from 'src/store/apps/crud/building';
import { floorType } from 'src/store/apps/crud/floor';
import { FloorplanType } from 'src/store/apps/crud/floorplan';
import { memberType } from 'src/store/apps/crud/member';
import { defaultVisitorFilter } from 'src/store/apps/defaultForm';

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
  // React Query hooks for data fetching
  const [searchVisitor, setSearchVisitor] = useState('');
  const { data: visitorData, refetch: refetchVisitors } = useVisitorList({ 
    ...defaultVisitorFilter, 
    Length: 999, 
    SearchValue: searchVisitor 
  });
  const visitorList = visitorData?.data ?? [];
  
  const { data: members = [] } = useAllMembers();
  const { data: buildingData = [] } = useAllBuilding();
  const { data: floorData = [] } = useAllFloors();
  const { data: floorplanData = [] } = useAllFloorplans();
  const { data: maskedAreaData = [] } = useAllMaskedAreas();
  
  // Mutation for sending invitation
  const { mutate: sendInvitation, isPending: isSaving } = useSendInvitation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType[]>([]);
  const [selectedMember, setSelectedMember] = useState<memberType>({} as memberType);
  const [selectedMaskedArea, setSelectedMaskedArea] = useState<string | null>(null);
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    
    // Refetch all data when dialog opens
    Promise.all([
      refetchVisitors(),
      // Other refetches would happen automatically due to enabled queries
    ]).finally(() => {
      setLoading(false);
      setOpen(true);
    });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    setLoading(true);

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

    sendInvitation(payload, {
      onSuccess: () => {
        toast.success('Invitation sent successfully');
        setLoading(false);
        handleClose();
      },
      onError: (error: any) => {
        console.error('Invitation failed', error);
        toast.error('Invitation failed');
        setLoading(false);
      },
    });
  };

  const buildingHierarchy = buildNestedHierarchy(
    buildingData,
    floorData,
    floorplanData,
    maskedAreaData,
  );

  function getAreaPath(areaId: string | null): string {
    if (!areaId) return 'None';
    const area = maskedAreaData.find((a: MaskedAreaType) => a.id === areaId);
    if (!area) return 'Unknown Area';

    const floorplan = floorplanData.find((fp: FloorplanType) => fp.id === area.floorplanId);
    const floor = floorplan ? floorData.find((f: floorType) => f.id === floorplan.floorId) : null;
    const building = floor ? buildingData.find((b: BuildingType) => b.id === floor.buildingId) : null;

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

    const area = maskedAreaData.find((a: MaskedAreaType) => a.id === areaId);
    if (!area) return ids;

    ids.add(area.id);

    const floorplan = floorplanData.find((fp: FloorplanType) => fp.id === area.floorplanId);
    if (floorplan) {
      ids.add(floorplan.id);
      const floor = floorData.find((f: floorType) => f.id === floorplan.floorId);
      if (floor) {
        ids.add(floor.id);
        const building = buildingData.find((b: BuildingType) => b.id === floor.buildingId);
        if (building) ids.add(building.id);
      }
    }

    return ids;
  }

  const selectedAncestorIds = getSelectedAncestorIds(selectedMaskedArea);

  // IDs of already-selected (registered) visitors
  const selectedIds = useMemo(
    () => new Set(selectedVisitor.filter((v: VisitorType) => !!v.id).map((v: VisitorType) => v.id as string)),
    [selectedVisitor],
  );

  // Only show visitors not yet selected
  const availableVisitors = useMemo(
    () => visitorList.filter((v: VisitorType) => !selectedIds.has(v.id)),
    [visitorList, selectedIds],
  );

  useEffect(() => {
    refetchVisitors();
  }, [searchVisitor, refetchVisitors]);

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
      const currentVisitor = updated[index];

      // Update the value
      updated[index] = { ...currentVisitor, [field]: value };

      // Only validate manual email inputs (no ID)
      if (field === 'email' && !currentVisitor.id) {
        const emailExists = visitorList.some((v: VisitorType) => v.email?.toLowerCase() === value.toLowerCase());

        setEmailErrors((prevErrors) => ({
          ...prevErrors,
          [index]: emailExists ? 'Email has been registered' : '',
        }));
      } else if (field === 'email' && currentVisitor.id) {
        // If editing an existing visitor (selected from list) → clear error
        setEmailErrors((prevErrors) => {
          const next = { ...prevErrors };
          delete next[index];
          return next;
        });
      }

      return updated;
    });
  };

  const handleRemoveRow = (indexToRemove: number) => {
    setSelectedVisitor((prev) => {
      const updated = prev.filter((_, index) => index !== indexToRemove);

      setEmailErrors((prev) =>
        updated.reduce((acc, _, newIndex) => {
          const oldIndex = newIndex >= indexToRemove ? newIndex + 1 : newIndex;
          if (prev[oldIndex]) acc[newIndex] = prev[oldIndex];
          return acc;
        }, {} as Record<number, string>)
      );

      return updated;
    });
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
                        minDateTime={startTime ?? undefined}
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
                  <CustomFormLabel> Purpose Visit (member) </CustomFormLabel>
                  <Autocomplete<memberType>
                    options={members} // use the actual member objects
                    value={selectedMember || null} // same selected state as CustomSelect
                    onChange={(_, newValue) => {
                      setSelectedMember(newValue ?? ({} as memberType));
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) => option?.name ?? ''} // show member name
                    clearOnEscape
                    disableClearable={false}
                    fullWidth
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Member"
                        variant="outlined"
                        fullWidth
                        required
                        error={!!(selectedMember === null || selectedMember.id === undefined)}
                        helperText={
                          !!(selectedMember === null || selectedMember.id === undefined)
                            ? 'Purpose Person is required'
                            : ''
                        }
                      />
                    )}
                  />
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
                                    backgroundColor: '#fff',
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
                                    backgroundColor: '#fff',
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
                                    backgroundColor: '#fff',
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
                                    backgroundColor: '#fff',
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
                                      <Box sx={{ position: 'relative' }}>
                                        <TextField
                                          value={visitor.email || ''}
                                          onChange={(e) =>
                                            handleChangeVisitorField(index, 'email', e.target.value)
                                          }
                                          fullWidth
                                          disabled={isRegistered}
                                          error={!!emailErrors[index]}
                                          helperText={emailErrors[index] || ' '}
                                          FormHelperTextProps={{
                                            sx: {
                                              minHeight: '20px',
                                              margin: 0,
                                              position: 'absolute',
                                              bottom: -20,
                                            },
                                          }}
                                        />
                                      </Box>
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
              onClick={handleSave}
              variant="contained"
              disabled={isSaving}
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              {isSaving ? 'Saving...' : 'Save'}
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
        {availableVisitors.map((v: VisitorType) => (
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
              setEmailErrors((prev) => {
                const newErrors = { ...prev };
                Object.keys(newErrors).forEach((key) => {
                  if (v.email && newErrors[Number(key)]) delete newErrors[Number(key)];
                });
                return newErrors;
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
