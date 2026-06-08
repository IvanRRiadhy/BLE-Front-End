import { useEffect, useMemo, useState } from 'react';
import { defaultPatrolAssignForm, defaultTimeGroupFilter } from 'src/store/apps/defaultForm';
import { useSelector, AppDispatch, RootState, useDispatch } from 'src/store/Store';
import {
  Box,
  Grid2 as Grid,
  Paper,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Button,
  IconButton,
  Autocomplete,
  GlobalStyles,
  Tooltip,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  PatrolRouteType,
  PatrolAssignType,
  SecurityType,
  SelectPatrolAssign,
  ShiftReplacementType,
} from 'src/store/apps/crud/patrolRoute';
import {
  useAssignmentReplacement,
  useEditPatrolAssign,
  usePatrolAssign,
} from 'src/hooks/usePatrolRoute';
import { useAllSecurityLookup, useAllSecuritys } from 'src/hooks/useSecurityGuard';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider, DatePicker, DateCalendar } from '@mui/x-date-pickers';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimeBlockType, TimeGroupType } from 'src/store/apps/crud/timeGroup';
import { useTimeGroupList } from 'src/hooks/useTimeGroup';
import toast from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router';
import { IconInfoCircle } from '@tabler/icons-react';
import { ApprovalType } from 'src/types/crud/input';
// import '@fullcalendar/daygrid/main.css';

interface CustomDayProps extends PickersDayProps<Dayjs> {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}
type ExtraDayProps = {
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
};

const PatrolAssignmentEdit = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const selectedPatrolRoute = useSelector(
    (state: RootState) => state.PatrolRouteReducer.selectedPatrolRoute,
  );
  const selectedPatrolAssign = useSelector(
    (state: RootState) => state.PatrolRouteReducer.selectedPatrolAssign,
  );
  const [formData, setFormData] = useState<PatrolAssignType>({
    ...defaultPatrolAssignForm,
    ...selectedPatrolAssign,
    patrolRouteId: selectedPatrolRoute?.id || '',
  });

  const mode = formData.id ? 'edit' : 'add';

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState<Dayjs | null>(
    formData.startDate ? dayjs(formData.startDate) : null,
  );

  const [endDate, setEndDate] = useState<Dayjs | null>(
    formData.endDate ? dayjs(formData.endDate) : null,
  );
  const assignmentTitle = mode === 'edit' ? 'Edit Assignment' : 'Add Assignment';
  //Form Selection Options
  const { data: securityData = [], isLoading: securityLoading } = useAllSecuritys();
  const securityOptions = useMemo(() => {
    const headSecurities = securityData
      .filter((s) => s.isHead)
      .map((m) => ({
        id: m.id,
        name: m.name,
        cardNumber: m.cardNumber,
        identityId: m.identityId,

        organizationName: m.organization?.name ?? '',
        departmentName: m.department?.name ?? '',
        districtName: m.district?.name ?? '',
      }));
    const nonHeadSecurities = securityData
      .filter((s) => !s.isHead)
      .map((m) => ({
        id: m.id,
        name: m.name,
        cardNumber: m.cardNumber,
        identityId: m.identityId,

        organizationName: m.organization?.name ?? '',
        departmentName: m.department?.name ?? '',
        districtName: m.district?.name ?? '',
      }));
    return {
      head: headSecurities,
      nonHead: nonHeadSecurities,
    };
  }, [securityData]);

  const availableSecurities = useMemo(() => {
    return securityOptions.nonHead.filter((s) => !formData.securityIds?.includes(s.id));
  }, [securityOptions.nonHead, formData.securityIds]);

  const { data: timeGroupData } = useTimeGroupList({
    ...defaultTimeGroupFilter,
    Length: 999,
    filters: { ScheduleType: 'Patrol' },
  });
  const timeGroupOptions = timeGroupData?.data ?? [];

  //Hooks
  const addMutation = usePatrolAssign();
  const editMutation = useEditPatrolAssign();

  //Helper
  const [headSearch, setHeadSearch] = useState<any | null>(null);
  const [headInputValue, setHeadInputValue] = useState('');
  const [securitySearch, setSecuritySearch] = useState<any | null>(null);
  const [securityInputValue, setSecurityInputValue] = useState('');
  const [timeGroupSearch, setTimeGroupSearch] = useState<TimeGroupType | null>(null);
  const [selectedHeadSecurities, setSelectedHeadSecurities] = useState<string[]>([]);

  const availableHeadSecurities = useMemo(() => {
    return securityOptions.head.filter((s) => !selectedHeadSecurities?.includes(s.id));
  }, [securityOptions.head, selectedHeadSecurities]);

  useEffect(() => {
    console.log('Selected Patrol Assign:', selectedPatrolAssign, formData);
    if (selectedPatrolAssign?.securityHead1) {
      const heads = [selectedPatrolAssign.securityHead1.id];

      if (
        selectedPatrolAssign.securityHead2 &&
        selectedPatrolAssign.securityHead2.id !== selectedPatrolAssign.securityHead1.id
      ) {
        heads.push(selectedPatrolAssign.securityHead2.id);
      }

      setSelectedHeadSecurities(heads);
      // console.log('Selected heads:', selectedHeadSecurities);
    }
    if (selectedPatrolAssign?.timeGroup) {
      console.log('Setting time group ID in form data:', selectedPatrolAssign.timeGroup.id);
      setFormData((prev) => ({
        ...prev,
        timeGroupId: selectedPatrolAssign.timeGroup?.id || '',
      }));
      setTimeGroupSearch(selectedPatrolAssign.timeGroup as TimeGroupType);
    }
  }, [selectedPatrolAssign]);

  const filteredApprovalTypes = useMemo(() => {
    const headCount = selectedHeadSecurities.length;

    if (headCount <= 1) {
      return ApprovalType.filter((a) =>
        ['ByThreatLevel', 'WithoutApproval', 'Or'].includes(a.value),
      );
    }

    return ApprovalType;
  }, [selectedHeadSecurities]);


  useEffect(() => {
    const validValues = filteredApprovalTypes.map((x) => x.value);

    if (formData.approvalType && !validValues.includes(formData.approvalType)) {
      setFormData((prev) => ({
        ...prev,
        approvalType: validValues[0] ?? '',
      }));
    }
  }, [filteredApprovalTypes]);

  // Cleanup on unmount to ensure state is cleared if user navigates away
  useEffect(() => {
    return () => {
      dispatch(SelectPatrolAssign(null));
    };
  }, [dispatch]);

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

  useEffect(() => {
    if (!startDate) return;
    console.log('Start Date:', startDate.format('YYYY-MM-DD'));
    setFormData((prev) => ({
      ...prev,
      startDate: startDate.format('YYYY-MM-DD'),
    }));
  }, [startDate]);

  useEffect(() => {
    if (!endDate) return;

    setFormData((prev) => ({
      ...prev,
      endDate: endDate.format('YYYY-MM-DD'),
    }));
  }, [endDate]);

  useEffect(() => {
    if (!startDate || !endDate) return;

    if (endDate.isBefore(startDate)) {
      setEndDate(startDate);
    }
  }, [startDate]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      errors.name = 'Patrol Assignment Name is required';
    }

    if (!formData.patrolRouteId) {
      errors.patrolRouteId = 'Patrol Route is required';
    }
    if (selectedHeadSecurities.length === 0) {
      errors.securityHead1Id = 'Head security is required';
    }
    if (!formData.securityIds || formData.securityIds.length === 0) {
      errors.securityIds = 'At least one security guard is required';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start time is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End time is required';
    }

    if (formData.endDate <= formData.startDate) {
      errors.endDate = 'End time must be after start time';
    }

    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      errors.endDate = 'End time must be after start time';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClose = () => {
    dispatch(SelectPatrolAssign(null));
    setFormData({
      ...defaultPatrolAssignForm,
      patrolRouteId: '',
    });
    setStartDate(null);
    setEndDate(null);
    setFormErrors({});
    navigate('/master/patrolroute'); // Navigate back to patrol routes list
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSaving(true);

    try {
      const head1 = selectedHeadSecurities[0];
      const head2 = selectedHeadSecurities[1] ?? head1;

      const payload: any = {
        ...formData,

        securityHead1Id: head1,
        securityHead2Id: head2,

        securityIds: formData.securityIds,
        timeGroupId: formData.timeGroupId,
      };

      if (mode === 'edit') {
        await editMutation.mutateAsync(payload);
        toast.success('Patrol assignment updated successfully');
      } else {
        await addMutation.mutateAsync(payload);
        toast.success('Patrol assignment created successfully');
      }
      handleClose();
    } catch (error: any) {
      console.error('Error saving patrol assignment:', error);
      toast.error(error?.response?.data?.message || 'Failed to save patrol assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to initial state or navigate away
    handleClose();
  };

  //Shift Replacement
  const ReplacementMutation = useAssignmentReplacement();
  const [openShiftReplacement, setOpenShiftReplacement] = useState(false);

  const [replacementForm, setReplacementForm] = useState<ShiftReplacementType>({
    id: '',
    patrolAssignmentId: '',
    originalSecurity: {} as SecurityType,
    substituteSecurity: {} as SecurityType,
    replacementStartDate: '',
    replacementEndDate: '',
    reason: '',
  });

  const originalSecurityOptions = useMemo(() => {
    return securityOptions.nonHead.filter((s) => formData.securityIds?.includes(s.id));
  }, [securityOptions.nonHead, formData.securityIds]);

  const substituteSecurityOptions = useMemo(() => {
    return securityOptions.nonHead.filter((s) => !formData.securityIds?.includes(s.id));
  }, [securityOptions.nonHead, formData.securityIds]);

  const handleSubmitReplacement = async () => {
    try {
      if (selectedPatrolAssign?.id === undefined)
        return toast.error('Please select a patrol assignment');
      if (replacementForm.replacementStartDate === null)
        return toast.error('Please select a replacement start date');
      if (replacementForm.replacementEndDate === null)
        return toast.error('Please select a replacement end date');
      const payload = {
        patrolAssignmentId: selectedPatrolAssign?.id,
        originalSecurityId: replacementForm.originalSecurity.id,
        substituteSecurityId: replacementForm.substituteSecurity.id,
        replacementStartDate: replacementForm.replacementStartDate,
        replacementEndDate: replacementForm.replacementEndDate,
        reason: replacementForm.reason,
      };

      console.log('Replacement Payload', payload);
      await ReplacementMutation.mutateAsync(payload);

      // await createShiftReplacement(payload)

      toast.success('Shift replacement created');

      handleCloseShiftReplacement();
    } catch (err) {
      toast.error('Failed to create replacement');
    }
  };
  const handleCloseShiftReplacement = () => {
    setOpenShiftReplacement(false);
    setReplacementForm({
      id: '',
      patrolAssignmentId: selectedPatrolAssign?.id || '',
      originalSecurity: {} as SecurityType,
      substituteSecurity: {} as SecurityType,
      replacementStartDate: '',
      replacementEndDate: '',
      reason: '',
    });
  };

  //Calendar

  const calendarEvents = useMemo(() => {
    if (!startDate || !endDate || !formData.timeGroupId) return [];

    const group = timeGroupOptions.find((g) => g.id === formData.timeGroupId);
    if (!group) return [];

    const events: any[] = [];

    let current = startDate.startOf('day');

    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      const dayName = current.format('dddd') as TimeBlockType['dayOfWeek'];

      const blocks = group.timeBlocks.filter((b) => b.dayOfWeek === dayName);

      blocks.forEach((block) => {
        const start = `${current.format('YYYY-MM-DD')}T${block.startTime}`;
        const end = `${current.format('YYYY-MM-DD')}T${block.endTime}`;

        events.push({
          title: `${block.startTime.slice(0, 5)} ${group.name}`,
          start,
          end,
          allDay: false,
          display: 'block',
          backgroundColor: '#e53935',
          borderColor: '#e53935',
          type: 'schedule',
        });
      });

      current = current.add(1, 'day');
    }

    /* =========================
     SHIFT REPLACEMENT EVENTS
     ========================= */

    if (selectedPatrolAssign?.shiftReplacements) {
      selectedPatrolAssign.shiftReplacements.forEach((rep: ShiftReplacementType) => {
        let repDate = dayjs(rep.replacementStartDate);

        const endRep = dayjs(rep.replacementEndDate);
        console.log('Reason Rep: ', rep.reason);
        while (repDate.isBefore(endRep) || repDate.isSame(endRep, 'day')) {
          events.push({
            title: `🔄 ${rep.originalSecurity.name} → ${rep.substituteSecurity.name}`,
            start: `${repDate.format('YYYY-MM-DD')}T22:59:59`,
            allDay: false,
            display: 'block',
            backgroundColor: '#ff9800',
            borderColor: '#ff9800',
            extendedProps: {
              type: 'replacement',
              reason: rep.reason,
              original: rep.originalSecurity.name,
              substitute: rep.substituteSecurity.name,
              replacement: rep,
            },
          });

          repDate = repDate.add(1, 'day');
        }
      });
    }
    if (replacementForm && !selectedPatrolAssign?.shiftReplacements?.includes(replacementForm)) {
      console.log('ReplacementForm: ', replacementForm);
      let repDate = dayjs(replacementForm.replacementStartDate);

      const endRep = dayjs(replacementForm.replacementEndDate);

      while (repDate.isBefore(endRep) || repDate.isSame(endRep, 'day')) {
        events.push({
          title: `🔄 ${replacementForm.originalSecurity.name} → ${replacementForm.substituteSecurity.name}`,
          start: `${repDate.format('YYYY-MM-DD')}T22:59:59`,
          allDay: false,
          display: 'block',
          backgroundColor: '#08aa00',
          borderColor: '#69f962',
          extendedProps: {
            type: 'replacement',
            reason: replacementForm.reason,
            original: replacementForm.originalSecurity.name,
            substitute: replacementForm.substituteSecurity.name,
            replacement: replacementForm,
          },
        });

        repDate = repDate.add(1, 'day');
      }
    }

    return events;
  }, [
    startDate,
    endDate,
    formData.timeGroupId,
    replacementForm,
    timeGroupOptions,
    selectedPatrolAssign?.shiftReplacements,
  ]);

  //Calendar Function
  const [calendarMenuAnchor, setCalendarMenuAnchor] = useState<HTMLElement | null>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Dayjs | null>(null);

  const handleCalendarDateClick = (info: any) => {
    setCalendarSelectedDate(dayjs(info.date));
    setCalendarMenuAnchor(info.dayEl); // anchor menu to the clicked cell
  };

  const handleSetStartDate = () => {
    if (!calendarSelectedDate) return;

    setStartDate(calendarSelectedDate);
    setCalendarMenuAnchor(null);
  };

  const handleSetEndDate = () => {
    if (!calendarSelectedDate) return;

    setEndDate(calendarSelectedDate);
    setCalendarMenuAnchor(null);
  };

  const handleCloseCalendarMenu = () => {
    setCalendarMenuAnchor(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={2} sx={{ height: '85vh' }}>
        {/* LEFT PANEL */}
        <Grid size={3}>
          <Box
            display="flex"
            flexDirection="column"
            gap={2}
            sx={{
              height: '90vh',
              overflowY: 'auto',
              px: 1,
            }}
          >
            {/* HEADER */}
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: 'background.paper',
                p: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h5" fontWeight={700}>
                {assignmentTitle}
              </Typography>
            </Box>

            {/* ASSIGNMENT INFO */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={700} mb={1}>
                Assignment Info
              </Typography>

              <CustomFormLabel htmlFor="name">Assignment Name</CustomFormLabel>
              <CustomTextField
                id="name"
                name="name"
                fullWidth
                value={formData.name || ''}
                onChange={handleInputChange}
                placeholder="Enter assignment name"
              />

              <CustomFormLabel htmlFor="description" sx={{ mt: 2 }}>
                Description
              </CustomFormLabel>

              <CustomTextField
                id="description"
                name="description"
                fullWidth
                multiline
                minRows={3}
                maxRows={3}
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Enter description"
              />
            </Paper>

            {/* SECURITY HEAD */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={700} mb={1}>
                Security Head
              </Typography>

              <Autocomplete
                size="small"
                options={availableHeadSecurities}
                getOptionLabel={(option) => option.name}
                value={headSearch}
                inputValue={headInputValue}
                disabled={selectedHeadSecurities.length >= 2}
                onInputChange={(e, value) => setHeadInputValue(value)}
                onChange={(e, value) => {
                  if (!value) return;

                  const current = selectedHeadSecurities || [];

                  if (current.length >= 2) {
                    toast.error('Max 2 Head Security');
                    return;
                  }

                  if (!current.includes(value.id)) {
                    // setFormData((prev) => ({
                    //   ...prev,
                    //   headSecurityIds: [...current, value.id],
                    // }));
                    setSelectedHeadSecurities((prev) => [...prev, value.id]);
                  }

                  setHeadSearch(null);
                  setHeadInputValue(''); // ✅ clears the text
                }}
                renderInput={(params) => (
                  <CustomTextField {...params} placeholder="Search head security..." />
                )}
              />

              <List
                sx={{
                  mt: 1,
                  minHeight: 96,
                  maxHeight: 96,
                  overflow: 'auto',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {selectedHeadSecurities?.map((id) => {
                  const sec = securityOptions.head.find((s) => s.id === id);

                  return (
                    <ListItem
                      key={id}
                      secondaryAction={
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            // setFormData((prev) => ({
                            //   ...prev,
                            //   headSecurityIds: prev.headSecurityIds?.filter((x) => x !== id),
                            // }));
                            setSelectedHeadSecurities((prev) => prev.filter((x) => x !== id));
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={sec?.name} secondary={sec?.organizationName} />
                    </ListItem>
                  );
                })}
              </List>
              <CustomFormLabel sx={{ mt: 2 }}>Approval Type</CustomFormLabel>

              <CustomTextField
                select
                fullWidth
                value={formData.approvalType || ''}
                disabled={selectedHeadSecurities.length === 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    approvalType: e.target.value,
                  }))
                }
              >
                {filteredApprovalTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Paper>

            {/* SECURITY */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={700} mb={1}>
                Security
              </Typography>

              <Autocomplete
                size="small"
                options={availableSecurities}
                getOptionLabel={(option) => option.name}
                value={securitySearch}
                inputValue={securityInputValue}
                onInputChange={(e, value) => setSecurityInputValue(value)}
                onChange={(e, value) => {
                  if (!value) return;

                  const current = formData.securityIds || [];

                  if (!current.includes(value.id)) {
                    setFormData((prev) => ({
                      ...prev,
                      securityIds: [...current, value.id],
                    }));
                  }

                  setSecuritySearch(null);
                  setSecurityInputValue(''); // ✅ clears input
                }}
                renderInput={(params) => (
                  <CustomTextField {...params} placeholder="Search security..." />
                )}
              />

              <List
                sx={{
                  mt: 1,
                  height: 200,
                  overflow: 'auto',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {formData.securityIds?.map((id) => {
                  const sec = securityOptions.nonHead.find((s) => s.id === id);

                  return (
                    <ListItem
                      key={id}
                      secondaryAction={
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              securityIds: prev.securityIds.filter((x) => x !== id),
                            }));
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={sec?.name} secondary={sec?.organizationName} />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>

            {/* PATROL PERIOD */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={700} mb={1}>
                Patrol Period
              </Typography>

              <Box display="flex" gap={1}>
                <DatePicker
                  label="Active From"
                  value={startDate}
                  onChange={(v) => setStartDate(v)}
                  format="DD/MM/YYYY"
                  // maxDate={endDate ?? undefined}
                />

                <DatePicker
                  label="Until"
                  value={endDate}
                  onChange={(v) => setEndDate(v)}
                  format="DD/MM/YYYY"
                  minDate={startDate ?? undefined}
                />
              </Box>
            </Paper>

            {/* TIME GROUP */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={700} mb={1}>
                Time Group
              </Typography>

              <Autocomplete
                size="small"
                options={timeGroupOptions}
                getOptionLabel={(option) => option.name}
                value={timeGroupSearch}
                onChange={(e, value) => {
                  setTimeGroupSearch(value);

                  setFormData((prev) => ({
                    ...prev,
                    timeGroupId: value?.id || '',
                  }));
                }}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    placeholder="Select Time Group..."
                    variant="outlined"
                    fullWidth
                  />
                )}
                renderOption={(props, option) => {
                  const tooltipContent = (
                    <Box>
                      {option.timeBlocks?.length ? (
                        option.timeBlocks.map((tb: TimeBlockType) => (
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
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description ?? 'No description'}
                          </Typography>
                        </Box>

                        <Tooltip title={tooltipContent} arrow placement="left">
                          <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                            <IconInfoCircle size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </li>
                  );
                }}
              />
            </Paper>

            {/* EXECUTION SETTINGS */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={700} mb={1}>
                Patrol Settings
              </Typography>

              {/* APPROVAL TYPE */}
              {/* <CustomFormLabel>Approval Type</CustomFormLabel>

  <CustomTextField
    select
    fullWidth
    value={formData.approvalType || ""}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({
        ...prev,
        approvalType: e.target.value,
      }))
    }
  >
    {ApprovalType.map((opt) => (
      <MenuItem key={opt.value} value={opt.value}>
        {opt.label}
      </MenuItem>
    ))}
  </CustomTextField> */}

              {/* DURATION TYPE */}
              <CustomFormLabel sx={{ mt: 2 }}>Duration</CustomFormLabel>

              <ToggleButtonGroup
                exclusive
                fullWidth
                value={formData.durationType}
                color="primary"
                onChange={(e, value) => {
                  if (!value) return;
                  setFormData((prev) => ({
                    ...prev,
                    durationType: value,
                  }));
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderColor: 'divider',
                    color: 'text.primary',
                    textTransform: 'none',
                  },

                  '& .MuiToggleButton-root.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderColor: 'primary.main',
                  },

                  '& .MuiToggleButton-root.Mui-selected:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                <ToggleButton value="NoDuration">No Duration</ToggleButton>
                <ToggleButton value="WithDuration">With Duration</ToggleButton>
              </ToggleButtonGroup>

              {/* START TYPE */}
              <CustomFormLabel sx={{ mt: 2 }}>Start Type</CustomFormLabel>

              <ToggleButtonGroup
                exclusive
                fullWidth
                value={formData.startType}
                color="primary"
                onChange={(e, value) => {
                  if (!value) return;
                  setFormData((prev) => ({
                    ...prev,
                    startType: value,
                  }));
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderColor: 'divider',
                    color: 'text.primary',
                    textTransform: 'none',
                  },

                  '& .MuiToggleButton-root.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderColor: 'primary.main',
                  },

                  '& .MuiToggleButton-root.Mui-selected:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                <ToggleButton value="Manual">Manual</ToggleButton>
                <ToggleButton value="AutoStart">Auto Start</ToggleButton>
              </ToggleButtonGroup>

              {/* CYCLE TYPE */}
              <CustomFormLabel sx={{ mt: 2 }}>Cycle Type</CustomFormLabel>

              <ToggleButtonGroup
                exclusive
                fullWidth
                value={formData.cycleType}
                color="primary"
                onChange={(e, value) => {
                  if (!value) return;
                  setFormData((prev) => ({
                    ...prev,
                    cycleType: value,
                  }));
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderColor: 'divider',
                    color: 'text.primary',
                    textTransform: 'none',
                  },

                  '& .MuiToggleButton-root.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderColor: 'primary.main',
                  },

                  '& .MuiToggleButton-root.Mui-selected:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                <ToggleButton value="HalfCycle">Half Cycle</ToggleButton>
                <ToggleButton value="FullCycle">Full Cycle</ToggleButton>
              </ToggleButtonGroup>

              {/* CYCLE COUNT */}
              <CustomFormLabel sx={{ mt: 2 }}>Cycle Count</CustomFormLabel>

              <CustomTextField
                type="number"
                fullWidth
                inputProps={{ min: 1 }}
                value={formData.cycleCount ?? 1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    cycleCount: Number(e.target.value),
                  }))
                }
              />
            </Paper>

            {/* STICKY FOOTER */}
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                backgroundColor: 'background.paper',
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box display="flex" justifyContent="space-between">
                <Button variant="outlined" onClick={handleCancel}>
                  Cancel
                </Button>

                <Button variant="contained" onClick={handleSave}>
                  {mode === 'edit' ? 'Update Assignment' : 'Create Assignment'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Grid>
        <GlobalStyles
          styles={{
            '.fc .patrol-start-end': { backgroundColor: '#1976d2 !important', color: 'white' },
            '.fc .patrol-between': { backgroundColor: '#90caf9 !important' },
            /* EVENT STYLE FIX */
            '.fc .fc-daygrid-event': {
              background: 'transparent !important',
              border: 'none !important',
              padding: '0 !important',
            },
          }}
        />
        {/* RIGHT PANEL */}
        <Grid size={9}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="100%"
              fixedWeekCount={false}
              events={calendarEvents}
              initialDate={startDate?.toDate()}
              dateClick={handleCalendarDateClick}
              dayCellClassNames={(arg) => {
                if (!startDate || !endDate) return [];

                const date = dayjs(arg.date);

                if (date.isSame(startDate, 'day') || date.isSame(endDate, 'day'))
                  return ['patrol-start-end'];

                if (date.isAfter(startDate, 'day') && date.isBefore(endDate, 'day'))
                  return ['patrol-between'];

                return [];
              }}
              eventContent={(arg) => {
                const type = arg.event.extendedProps?.type;
                const reason = arg.event.extendedProps?.reason;
                const original = arg.event.extendedProps?.original;
                const substitute = arg.event.extendedProps?.substitute;

                if (type === 'replacement') {
                  console.log('Reason: ', reason);
                  return (
                    <Tooltip
                      arrow
                      placement="top"
                      title={
                        <Box>
                          <Typography fontWeight={700} fontSize={12}>
                            Shift Replacement
                          </Typography>

                          <Typography fontSize={12}>
                            {original} → {substitute}
                          </Typography>

                          <Divider sx={{ my: 0.5 }} />

                          <Typography fontSize={11}>{reason}</Typography>
                        </Box>
                      }
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          background: `${arg.event.backgroundColor}`,
                          color: 'white',
                          fontSize: 11,
                          px: 0.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        🔄 {original} → {substitute}
                      </Box>
                    </Tooltip>
                  );
                }

                return (
                  <Box
                    sx={{
                      background: '#e53935',
                      color: 'white',
                      fontWeight: 600,
                      px: 0.5,
                      borderRadius: 1,
                      fontSize: 12,
                      overflow: 'hidden',
                    }}
                  >
                    {arg.event.title}
                  </Box>
                );
              }}
              eventClick={(info) => {
                const replacement = info.event.extendedProps?.replacement;

                if (!replacement) return;

                setReplacementForm(replacement);

                setOpenShiftReplacement(true);
              }}
            />
            <Menu
              anchorEl={calendarMenuAnchor}
              open={Boolean(calendarMenuAnchor)}
              onClose={handleCloseCalendarMenu}
              anchorOrigin={{
                vertical: 'center',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'center',
                horizontal: 'center',
              }}
              PaperProps={{
                sx: {
                  minWidth: 160,
                  borderRadius: 2,
                  p: 0.5,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1, backgroundColor: 'primary.light' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Options
                </Typography>
              </Box>

              <MenuItem
                onClick={handleSetStartDate}
                disabled={endDate && calendarSelectedDate?.isAfter(endDate) === true ? true : false}
              >
                Set as Start Date
              </MenuItem>

              <MenuItem
                onClick={handleSetEndDate}
                disabled={
                  startDate && calendarSelectedDate?.isBefore(startDate) === true ? true : false
                }
              >
                Set as End Date
              </MenuItem>
              {mode === 'edit' && (
                <MenuItem
                  onClick={() => {
                    if (!calendarSelectedDate) return;

                    setReplacementForm((prev) => ({
                      ...prev,
                      patrolAssignmentId: selectedPatrolAssign?.id ?? '',
                      replacementStartDate: calendarSelectedDate.format('YYYY-MM-DD'),
                      replacementEndDate: calendarSelectedDate.format('YYYY-MM-DD'),
                    }));

                    setCalendarMenuAnchor(null);
                    setOpenShiftReplacement(true);
                  }}
                >
                  Shift Replacement
                </MenuItem>
              )}
            </Menu>
          </Paper>
          <Dialog
            open={openShiftReplacement}
            onClose={handleCloseShiftReplacement}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Shift Replacement</DialogTitle>

            <DialogContent>
              {/* ORIGINAL SECURITY */}
              <CustomFormLabel>Original Security</CustomFormLabel>

              <Autocomplete
                options={originalSecurityOptions}
                getOptionLabel={(opt) => opt.name}
                onChange={(e, value) =>
                  setReplacementForm((prev) => ({
                    ...prev,
                    originalSecurity: value as SecurityType,
                  }))
                }
                renderInput={(params) => (
                  <CustomTextField {...params} placeholder="Select security" />
                )}
              />

              {/* SUBSTITUTE SECURITY */}

              <CustomFormLabel sx={{ mt: 2 }}>Substitute Security</CustomFormLabel>

              <Autocomplete
                options={substituteSecurityOptions}
                getOptionLabel={(opt) => opt.name}
                onChange={(e, value) =>
                  setReplacementForm((prev) => ({
                    ...prev,
                    substituteSecurity: value as SecurityType,
                  }))
                }
                renderInput={(params) => (
                  <CustomTextField {...params} placeholder="Select substitute security" />
                )}
              />

              {/* START DATE */}

              <CustomFormLabel sx={{ mt: 2 }}>Replacement Start</CustomFormLabel>

              <DatePicker
                disabled
                value={
                  replacementForm.replacementStartDate
                    ? dayjs(replacementForm.replacementStartDate)
                    : null
                }
                format="DD/MM/YYYY"
              />

              {/* END DATE */}

              <CustomFormLabel sx={{ mt: 2 }}>Replacement End</CustomFormLabel>

              <DatePicker
                value={
                  replacementForm.replacementEndDate
                    ? dayjs(replacementForm.replacementEndDate)
                    : null
                }
                minDate={
                  replacementForm.replacementStartDate
                    ? dayjs(replacementForm.replacementStartDate)
                    : undefined
                }
                onChange={(v) =>
                  setReplacementForm((prev) => ({
                    ...prev,
                    replacementEndDate: v ? v.format('YYYY-MM-DD') : '',
                  }))
                }
                format="DD/MM/YYYY"
              />

              {/* REASON */}

              <CustomFormLabel sx={{ mt: 2 }}>Reason</CustomFormLabel>

              <CustomTextField
                multiline
                minRows={3}
                fullWidth
                value={replacementForm.reason}
                onChange={(e: any) =>
                  setReplacementForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Enter reason"
              />
            </DialogContent>

            <DialogActions>
              <Button variant="outlined" onClick={handleCloseShiftReplacement}>
                Cancel
              </Button>

              <Button variant="contained" onClick={handleSubmitReplacement}>
                Save Replacement
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
};

export default PatrolAssignmentEdit;
