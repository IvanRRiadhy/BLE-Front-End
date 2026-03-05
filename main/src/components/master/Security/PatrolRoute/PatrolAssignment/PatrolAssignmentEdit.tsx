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
} from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  PatrolRouteType,
  PatrolAssignType,
  SecurityType,
  SelectPatrolAssign,
} from 'src/store/apps/crud/patrolRoute';
import { useEditPatrolAssign, usePatrolAssign } from 'src/hooks/usePatrolRoute';
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

  const availableHeadSecurities = useMemo(() => {
    return securityOptions.head.filter((s) => !formData.headSecurityIds?.includes(s.id));
  }, [securityOptions.head, formData.headSecurityIds]);

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

    setFormData((prev) => ({
      ...prev,
      startDate: startDate.hour(0).minute(0).second(0).millisecond(0).toISOString(),
    }));
  }, [startDate]);

  useEffect(() => {
    if (!endDate) return;

    setFormData((prev) => ({
      ...prev,
      endDate: endDate.hour(23).minute(59).second(59).millisecond(999).toISOString(),
    }));
  }, [endDate]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      errors.name = 'Patrol Assignment Name is required';
    }

    if (!formData.patrolRouteId) {
      errors.patrolRouteId = 'Patrol Route is required';
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
      const payload: Partial<PatrolAssignType> = {
        ...formData,
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
        });
      });

      current = current.add(1, 'day');
    }

    return events;
  }, [startDate, endDate, formData.timeGroupId, timeGroupOptions]);

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
                onInputChange={(e, value) => setHeadInputValue(value)}
                onChange={(e, value) => {
                  if (!value) return;

                  const current = formData.headSecurityIds || [];

                  if (current.length >= 2) {
                    toast.error('Max 2 Head Security');
                    return;
                  }

                  if (!current.includes(value.id)) {
                    setFormData((prev) => ({
                      ...prev,
                      headSecurityIds: [...current, value.id],
                    }));
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
                {formData.headSecurityIds?.map((id) => {
                  const sec = securityOptions.head.find((s) => s.id === id);

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
                              headSecurityIds: prev.headSecurityIds?.filter((x) => x !== id),
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
                />

                <DatePicker
                  label="Until"
                  value={endDate}
                  onChange={(v) => setEndDate(v)}
                  format="DD/MM/YYYY"
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
              dayCellClassNames={(arg) => {
                if (!startDate || !endDate) return [];

                const date = dayjs(arg.date);

                if (date.isSame(startDate, 'day') || date.isSame(endDate, 'day'))
                  return ['patrol-start-end'];

                if (date.isAfter(startDate, 'day') && date.isBefore(endDate, 'day'))
                  return ['patrol-between'];

                return [];
              }}
              eventContent={(arg) => (
                <div
                  style={{
                    background: '#e53935',
                    color: 'white',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {arg.event.title}
                </div>
              )}
            />
          </Paper>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
};

export default PatrolAssignmentEdit;
