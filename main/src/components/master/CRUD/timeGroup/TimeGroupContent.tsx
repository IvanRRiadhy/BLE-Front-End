import { Grid2 as Grid, Divider, Typography, Box, Paper, Button, Stack } from '@mui/material';
import { useState, useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { TimeGridSelector } from 'src/components/shared/TimeGridSelector';
import { useDispatch, useSelector } from 'src/store/Store';
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

  const [formData, setFormData] = useState<TimeGroupType>({
    ...defaultTimeGroupForm,
    ...selectedTimeGroup,
  });
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
