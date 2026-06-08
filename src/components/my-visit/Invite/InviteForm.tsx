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
  Collapse,
  MenuList,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
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
import { fetchMemberDT, memberType } from 'src/store/apps/crud/member';
import { DateTimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { defaultMemberForm, defaultVisitorForm } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { floorplanType } from 'src/types/tracking/floorplan';

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

type CombinedRow = {
  source: 'visitor' | 'member';
  sourceIndex: number;
  id?: string | null;
  name?: string | null;
  email?: string | null;
  isVip?: boolean | null;
};
type RowError = { name?: string; email?: string };
type FormErrors = {
  maskedArea?: string;
  agenda?: string;
  time?: string;
  visitors?: string; // “at least one visitor” error
  rowErrors?: RowError[]; // same length as selectedVisitor
};

const InviteForm = () => {
  const dispatch: AppDispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const visitorList = useSelector((state: RootState) => state.visitorReducer.visitors);
  const memberList = useSelector((state: RootState) => state.memberReducer.members);
  const buildingData = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floorData = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType[]>([]);
  const [selectedMember, setSelectedMember] = useState<memberType[]>([]);
  const [selectedMaskedArea, setSelectedMaskedArea] = useState<string | null>(null);

  const [searchName, setSearchName] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs());
  const [endTime, setEndTime] = useState<Dayjs | null>(dayjs());
  const [openMenu, setOpenMenu] = useState(false);
  const [openMemberSection, setOpenMemberSection] = useState(true);
  const [openVisitorSection, setOpenVisitorSection] = useState(true);

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const toUtcFormatted = (time: dayjs.Dayjs | null) => {
    return time?.utc().format('YYYY-MM-DDTHH:mm:ss.SSS');
  };

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    setSelectedVisitor([{ ...defaultVisitorForm, name: '', email: '' }]);
    setSelectedMaskedArea('');
    setSelectedMember([]);
    setSearchName('');
    setNotes('');
    setStartTime(dayjs());
    setEndTime(dayjs());
    dispatch(fetchVisitorDT({ ...visitorFilter, length: 999 }));
    dispatch(fetchMemberDT({ ...memberFilter, length: 999 }));
    // dispatch(fetchMaskedAreas());
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

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const notEmpty = (v?: string | null) => !!v && v.trim().length > 0;

  const dedupe = <T,>(arr: T[]) => {
    const m = new Map<T, number>();
    arr.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
    return m;
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const rowErrors: RowError[] = selectedVisitor.map(() => ({}));

    // Area
    if (!selectedMaskedArea) {
      errors.maskedArea = 'Visiting Area is required';
    }

    // Agenda
    if (!notEmpty(notes) || (notes ?? '').trim().length < 5) {
      errors.agenda = 'Agenda must be at least 5 characters';
    }

    // Time
    if (!startTime || !endTime) {
      errors.time = 'Start and End time are required';
    } else if (!endTime.isAfter(startTime)) {
      errors.time = 'End time must be after start time';
    }

    // At least one visitor (matches your current backend payload)
    if (selectedVisitor.length === 0) {
      errors.visitors = 'Add at least one visitor';
    }

    // Per-row validation for unregistered visitors (id is undefined/null)
    const emailsForDedupe: string[] = [];

    selectedVisitor.forEach((v, idx) => {
      const isRegistered = !!v.id;

      if (!isRegistered) {
        if (!notEmpty(v.name)) {
          rowErrors[idx].name = 'Name is required';
        } else if ((v.name ?? '').trim().length < 2) {
          rowErrors[idx].name = 'Name must be at least 2 characters';
        }

        if (!notEmpty(v.email)) {
          rowErrors[idx].email = 'Email is required';
        } else if (!isEmail(v.email!)) {
          rowErrors[idx].email = 'Invalid email format';
        } else {
          emailsForDedupe.push((v.email ?? '').trim().toLowerCase());
        }
      }
    });

    // Duplicate email check among newly entered (unregistered) visitors
    const counts = dedupe(emailsForDedupe);
    if (emailsForDedupe.length > 0) {
      // map back duplicates to row errors
      const duplicates = new Set([...counts.entries()].filter(([, c]) => c > 1).map(([e]) => e));
      if (duplicates.size > 0) {
        selectedVisitor.forEach((v, idx) => {
          if (!v.id && v.email && duplicates.has(v.email.trim().toLowerCase())) {
            rowErrors[idx].email = 'Duplicate email';
          }
        });
      }
    }

    // Attach row errors if any
    if (rowErrors.some((re) => re.name || re.email)) {
      errors.rowErrors = rowErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    const ok = validateForm();
    if (!ok) {
      toast.error('Please fix the highlighted errors.');
      scrollToFirstError();
      return;
    }
    setLoading(true);
    setSaving(true);

    const startDate = toUtcFormatted(startTime);
    const endDate = toUtcFormatted(endTime);

    // Transform into backend's expected shape
    const payload = selectedVisitor.map((visitor) => ({
      Email: visitor.email,
      isVip: visitor.isVip,
      MaskedAreaId: selectedMaskedArea,
      VisitorPeriodStart: startDate,
      VisitorPeriodEnd: endDate,
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

  useEffect(() => {
    dispatch(fetchVisitorDT({ ...visitorFilter, length: 999, SearchValue: searchName }));
  }, [searchName]);

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
  const handleRemoveVisitorRow = (indexToRemove: number) => {
    setSelectedVisitor((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveMemberRow = (indexToRemove: number) => {
    setSelectedMember((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };
  const handleCloseMenu = () => {
    setOpenMenu(false);
    setAnchorEl(null);
  };

  const selectedIds = useMemo(
    () => new Set(selectedVisitor.filter((v) => !!v.id).map((v) => v.id as string)),
    [selectedVisitor],
  );

  const selectedMemberIds = useMemo(
    () => new Set(selectedMember.filter((v) => !!v.id).map((v) => v.id as string)),
    [selectedMember],
  );

  // Only show visitors not yet selected
  const availableVisitors = useMemo(
    () => visitorList.filter((v: VisitorType) => !selectedIds.has(v.id)),
    [visitorList, selectedIds],
  );

  const availableMembers = useMemo(
    () => memberList.filter((m: memberType) => !selectedMemberIds.has(m.id)),
    [memberList, selectedMemberIds],
  );

  const rows: CombinedRow[] = useMemo(() => {
    const memberRows: CombinedRow[] = selectedMember.map((m, i) => ({
      source: 'member',
      sourceIndex: i,
      id: m.id ?? null,
      name: m.name ?? '',
      email: (m as any).email ?? (m as any).cardNumber ?? '',
      isVip: null,
    }));

    const visitorRows: CombinedRow[] = selectedVisitor.map((v, i) => ({
      source: 'visitor',
      sourceIndex: i,
      id: v.id ?? null,
      name: v.name ?? '',
      email: v.email ?? '',
      isVip: !!v.isVip,
    }));

    // You can choose the order; here we show Members first then Visitors
    return [...memberRows, ...visitorRows];
  }, [selectedMember, selectedVisitor]);

  const scrollToFirstError = () => {
    // Check order: area -> time -> agenda -> table rows
    if (formErrors.maskedArea) {
      document
        .querySelector('#area-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (formErrors.time) {
      document
        .querySelector('input[placeholder*="Start Time"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (formErrors.agenda) {
      document.querySelector('#notes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (formErrors.rowErrors) {
      // Find the first row with error and scroll its input
      const idx = formErrors.rowErrors.findIndex((r) => r.name || r.email);
      if (idx >= 0) {
        // your inputs are controlled; add data-index attributes for reliability
        document
          .querySelector(`[data-visitor-name="${idx}"], [data-visitor-email="${idx}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <>
      <Tooltip title="Add Visitor">
        <Button
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
              <Grid container size={6} height={'550px'}>
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
                            error: !!formErrors.time,
                            helperText: formErrors.time,
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
                            error: !!formErrors.time,
                            helperText: formErrors.time,
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
                  {formErrors.maskedArea && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {formErrors.maskedArea}
                    </Typography>
                  )}
                  <CustomFormLabel> Agenda </CustomFormLabel>
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
                    error={!!formErrors.agenda}
                    helperText={formErrors.agenda}
                  />
                </Grid>
              </Grid>
              <Grid container size={6}>
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
                          sx={{ width: '100%', maxHeight: '550px' }}
                        >
                          <Table stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 2,
                                    backgroundColor: '#fff',
                                    width: 110,
                                  }}
                                >
                                  <Typography fontWeight={600}>Type</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 2,
                                    backgroundColor: '#fff',
                                    width: '35%',
                                  }}
                                >
                                  <Typography fontWeight={600}>Name</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 2,
                                    backgroundColor: '#fff',
                                    width: '35%',
                                  }}
                                >
                                  <Typography fontWeight={600}>Email</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 2,
                                    backgroundColor: '#fff',
                                    width: 80,
                                  }}
                                >
                                  <Typography fontWeight={600}>VIP</Typography>
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    position: 'sticky',
                                    right: 0,
                                    top: 0,
                                    zIndex: 2,
                                    backgroundColor: '#fff',
                                    width: 80,
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
                              {rows.map((row, i) => {
                                const isVisitor = row.source === 'visitor';
                                const isRegistered = !!row.id;

                                return (
                                  <TableRow
                                    key={`${row.source}-${row.id ?? `tmp-${row.sourceIndex}`}`}
                                    sx={{ backgroundColor: isVisitor ? 'inherit' : '#fafafa' }}
                                  >
                                    {/* Type */}
                                    <TableCell align="center">
                                      <Typography variant="body2" fontWeight={600}>
                                        {isVisitor ? 'Visitor' : 'Member'}
                                      </Typography>
                                    </TableCell>

                                    {/* Name */}
                                    <TableCell>
                                      {isVisitor ? (
                                        <TextField
                                          value={row.name ?? ''}
                                          onChange={(e) =>
                                            handleChangeVisitorField(
                                              row.sourceIndex,
                                              'name',
                                              e.target.value,
                                            )
                                          }
                                          fullWidth
                                          disabled={isRegistered}
                                          error={!!formErrors.rowErrors?.[row.sourceIndex]?.name}
                                          helperText={formErrors.rowErrors?.[row.sourceIndex]?.name}
                                        />
                                      ) : (
                                        <TextField value={row.name ?? ''} fullWidth disabled />
                                      )}
                                    </TableCell>

                                    {/* Email */}
                                    <TableCell>
                                      {isVisitor ? (
                                        <TextField
                                          value={row.email ?? ''}
                                          onChange={(e) =>
                                            handleChangeVisitorField(
                                              row.sourceIndex,
                                              'email',
                                              e.target.value,
                                            )
                                          }
                                          fullWidth
                                          disabled={isRegistered}
                                          error={!!formErrors.rowErrors?.[row.sourceIndex]?.email}
                                          helperText={
                                            formErrors.rowErrors?.[row.sourceIndex]?.email
                                          }
                                        />
                                      ) : (
                                        <TextField value={row.email ?? ''} fullWidth disabled />
                                      )}
                                    </TableCell>

                                    {/* VIP (visitors only) */}
                                    <TableCell align="center">
                                      {isVisitor ? (
                                        <Switch
                                          checked={!!row.isVip}
                                          onChange={(e) =>
                                            handleChangeVisitorField(
                                              row.sourceIndex,
                                              'isVip',
                                              e.target.checked as any,
                                            )
                                          }
                                          disabled={isRegistered}
                                        />
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          —
                                        </Typography>
                                      )}
                                    </TableCell>

                                    {/* Delete */}
                                    <TableCell align="center">
                                      <Tooltip title="Delete row">
                                        <IconButton
                                          color="error"
                                          onClick={() =>
                                            row.source === 'visitor'
                                              ? handleRemoveVisitorRow(row.sourceIndex)
                                              : handleRemoveMemberRow(row.sourceIndex)
                                          }
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
              disabled={saving}
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
        PaperProps={{ sx: { maxHeight: 500, width: 340, p: 0 } }}
      >
        <MenuList dense disablePadding>
          {/* Member header */}
          <ListItemButton
            onClick={() => setOpenMemberSection((v) => !v)}
            sx={{
              px: 2,
              py: 1,
              backgroundColor: '#f0f0f0',
              '&:hover': {
                backgroundColor: '#e0e0e0', // darker shade
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <IconUsers size={18} />
            </ListItemIcon>
            <ListItemText primary="Member" primaryTypographyProps={{ fontWeight: 700 }} />
            {openMemberSection ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ListItemButton>

          {/* Member list */}
          <Collapse in={openMemberSection} timeout="auto" unmountOnExit>
            <Box sx={{ maxHeight: 180, overflowY: 'auto', py: 0 }}>
              {availableMembers.length === 0 && (
                <Box sx={{ px: 2, py: 1.5, color: 'text.secondary' }}>
                  <Typography variant="body2">No members found</Typography>
                </Box>
              )}
              {availableMembers.map((m: memberType) => (
                <MenuItem
                  key={m.id}
                  onClick={() => {
                    setSelectedMember((prev) => {
                      if (m.id && prev.some((p) => p.id === m.id)) return prev;
                      if (prev.length === 1 && !prev[0].id && !prev[0].email && !prev[0].name)
                        return [m];
                      return [...prev, m];
                    });
                    handleCloseMenu();
                  }}
                  sx={{ py: 1, px: 2 }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.cardNumber || m.email}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Box>
          </Collapse>

          <Divider />

          {/* Visitor header */}
          <ListItemButton
            onClick={() => setOpenVisitorSection((v) => !v)}
            sx={{
              px: 2,
              py: 1,
              backgroundColor: '#f0f0f0',
              '&:hover': {
                backgroundColor: '#e0e0e0', // darker shade
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <IconUser size={18} />
            </ListItemIcon>
            <ListItemText primary="Visitor" primaryTypographyProps={{ fontWeight: 700 }} />
            {openVisitorSection ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ListItemButton>

          {/* Visitor list (+ Add New) */}
          <Collapse in={openVisitorSection} timeout="auto" unmountOnExit>
            <Box sx={{ maxHeight: 220, overflowY: 'auto', position: 'relative' }}>
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
                  backgroundColor: 'background.paper',
                  zIndex: 1,
                  fontWeight: 'bold',
                  py: 1,
                  px: 2,
                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <IconPlus size={16} style={{ marginRight: 8 }} /> Add New Visitor
              </MenuItem>

              {availableVisitors.length === 0 && (
                <Box sx={{ px: 2, py: 1.5, color: 'text.secondary' }}>
                  <Typography variant="body2">No visitors found</Typography>
                </Box>
              )}
              {availableVisitors.map((v: VisitorType) => (
                <MenuItem
                  key={v.id}
                  onClick={() => {
                    setSelectedVisitor((prev) => {
                      if (v.id && prev.some((p) => p.id === v.id)) return prev;
                      if (prev.length === 1 && !prev[0].id && !prev[0].email && !prev[0].name) {
                        return [v];
                      }
                      return [...prev, v];
                    });
                    handleCloseMenu();
                  }}
                  sx={{ py: 1, px: 2 }}
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
            </Box>
          </Collapse>
        </MenuList>
      </Menu>
    </>
  );
};

export default InviteForm;

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
