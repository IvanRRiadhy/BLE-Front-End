import {
  Grid2 as Grid,
  Divider,
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  Autocomplete,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { TimeGridSelector } from 'src/components/shared/TimeGridSelector';
import { useDispatch, useSelector } from 'src/store/Store';
import { CardAccessType, fetchCardAccess } from 'src/store/apps/crud/cardAccess';
import {
  TimeGroupType,
  TimeBlockType,
  CancelNewTimeGroup,
  saveNewTimeGroup,
  fetchTimeGroupDT,
  UpdateSelectedTimeGroup,
} from 'src/store/apps/crud/timeGroup';
import { defaultTimeGroupForm } from 'src/store/apps/defaultForm';

const TimeGroupDetails = () => {
  const dispatch = useDispatch();
  const selectedTimeGroup = useSelector((state: any) => state.TimeGroupReducer.selectedTimeGroup);
  const isNewTimeGroup = useSelector((state: any) => state.TimeGroupReducer.isNewTimeGroup);
  const cardAccess = useSelector((state: any) => state.CardAccessReducer.cardAccessAll);

  const [formData, setFormData] = useState<TimeGroupType>({
    ...defaultTimeGroupForm,
    ...selectedTimeGroup,
  });
  useEffect(() => {
    dispatch(fetchCardAccess());
  }, [dispatch]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockType[]>(formData.timeBlocks ?? []);

  useEffect(() => {
    if (selectedTimeGroup) {
      setFormData({
        ...defaultTimeGroupForm,
        ...selectedTimeGroup,
      });
      setTimeBlocks(selectedTimeGroup.timeBlocks ?? []);
    }
  }, [selectedTimeGroup]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, name, id } = e.target;
    setFormData((prev) => ({ ...prev, [id || name]: value }));
    dispatch(UpdateSelectedTimeGroup({ [id || name]: value }));
  };

  const handleTimeGridChange = (blocks: TimeBlockType[]) => {
    setTimeBlocks(blocks);
    setFormData((prev) => ({
      ...prev,
      timeBlocks: blocks,
    }));
    console.log('FormData: ', formData);
  };

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      {selectedTimeGroup ? (
        <>
          <Typography component="div" variant="h4" mb={2} fontWeight={700}>
            Time Group Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={5}>
            <Grid size={{ lg: 2.5, md: 12, sm: 12 }}>
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

              <CustomFormLabel htmlFor="description">Description</CustomFormLabel>
              <CustomTextField
                id="description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.description}
                helperText={formErrors.description}
                multiline
                minRows={3}
                maxRows={5}
              />
              <CustomFormLabel>Card Access</CustomFormLabel>
              <Autocomplete
                multiple
                options={cardAccess}
                getOptionLabel={(option: CardAccessType) => option.name}
                filterSelectedOptions
                value={cardAccess.filter((ca: CardAccessType) =>
                  (formData.cardAccessIds ?? []).includes(ca.id),
                )}
                onChange={(_e, newValue) => {
                  setFormData((prev) => ({
                    ...prev,
                    cardAccessIds: newValue.map((ca) => ca.id),
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Type Card Access name..."
                    variant="outlined"
                    fullWidth
                  />
                )}
                renderTags={() => null}
                renderOption={(props, option) => {
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
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.remarks ?? 'No description'}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
              />
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
                {(formData.cardAccessIds ?? []).length === 0 ? (
                  <Typography variant="body1" color="text.secondary">
                    Selected Card Access: None
                  </Typography>
                ) : (
                  (formData.cardAccessIds ?? []).map((id) => {
                    const ca = cardAccess.find((ca: CardAccessType) => ca.id === id);
                    if (!ca) return null;

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
                            {ca.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ca.remarks ?? 'No description'}
                          </Typography>
                        </Box>

                        {/* Right side: (i) info + (x) remove */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                cardAccessIds: (prev.cardAccessIds ?? []).filter(
                                  (fid) => fid !== id,
                                ),
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

            <Grid size={{ lg: 9.5, md: 12, sm: 12 }}>
              <TimeGridSelector
                onSelectionChange={handleTimeGridChange}
                initialData={formData.timeBlocks}
              />
            </Grid>
          </Grid>
        </>
      ) : (
        <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
          <Box>
            <Typography variant="h4">Please Select a Time Group</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default TimeGroupDetails;
