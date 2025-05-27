import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid2 as Grid, // Using Grid2 directly
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Divider,
} from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useTheme } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { Box } from '@mui/system';

const variables = {
  areas: [
    { building: 'Alpha Tower', floorplan: 'Ground Floor', area: 'Lobby' },
    { building: 'Alpha Tower', floorplan: 'Ground Floor', area: 'Reception' },
    { building: 'Alpha Tower', floorplan: '1st Floor', area: 'Conference Room A' },
    { building: 'Alpha Tower', floorplan: '1st Floor', area: 'Office 101' },
    { building: 'Alpha Tower', floorplan: '2nd Floor', area: 'Break Room' },
    { building: 'Alpha Tower', floorplan: '2nd Floor', area: 'Storage Room' },
    { building: 'Alpha Tower', floorplan: '3rd Floor', area: 'Office 301' },
    { building: 'Alpha Tower', floorplan: '3rd Floor', area: 'Meeting Room 3B' },
    { building: 'Alpha Tower', floorplan: '3rd Floor', area: 'Open Workspace' },
    { building: 'Alpha Tower', floorplan: '3rd Floor', area: 'Server Closet' },
    { building: 'Beta Complex', floorplan: 'Main Floor', area: 'Help Desk' },
    { building: 'Beta Complex', floorplan: 'Main Floor', area: 'Waiting Area' },
    { building: 'Beta Complex', floorplan: 'Mezzanine', area: 'Security Room' },
    { building: 'Beta Complex', floorplan: 'Mezzanine', area: 'Pantry' },
    { building: 'Beta Complex', floorplan: 'East Wing', area: 'IT Lab' },
    { building: 'Beta Complex', floorplan: 'East Wing', area: 'Tech Storage' },
    { building: 'Beta Complex', floorplan: 'West Wing', area: 'HR Office' },
    { building: 'Beta Complex', floorplan: 'West Wing', area: 'Recruitment Room' },
    { building: 'Beta Complex', floorplan: 'West Wing', area: 'Training Hall' },
    { building: 'Beta Complex', floorplan: 'West Wing', area: 'Quiet Room' },
  ],
  members: [
    { name: 'John Doe', organization: 'ABC Corp', department: 'Engineering', district: 'North' },
    { name: 'Emma Wilson', organization: 'ABC Corp', department: 'Engineering', district: 'North' },
    { name: 'Liam Brooks', organization: 'ABC Corp', department: 'Marketing', district: 'South' },
    { name: 'Olivia Harris', organization: 'ABC Corp', department: 'Marketing', district: 'South' },
    {
      name: 'Sophia Bennett',
      organization: 'ABC Corp',
      department: 'Operations',
      district: 'East',
    },
    { name: 'Lucas Gray', organization: 'ABC Corp', department: 'Finance', district: 'West' },
    { name: 'Nora Parker', organization: 'ABC Corp', department: 'Finance', district: 'West' },
    { name: 'Ethan Lee', organization: 'ABC Corp', department: 'Engineering', district: 'East' },
    { name: 'Amelia Reed', organization: 'ABC Corp', department: 'Operations', district: 'North' },
    {
      name: 'Charlie Davis',
      organization: 'ABC Corp',
      department: 'Operations',
      district: 'North',
    },
    { name: 'Alice Johnson', organization: 'XYZ Inc', department: 'Sales', district: 'East' },
    { name: 'Bob Brown', organization: 'XYZ Inc', department: 'HR', district: 'South' },
    { name: 'Mia Rogers', organization: 'XYZ Inc', department: 'Legal', district: 'Central' },
    { name: 'Noah Evans', organization: 'XYZ Inc', department: 'Legal', district: 'Central' },
    { name: 'Grace Miller', organization: 'XYZ Inc', department: 'IT', district: 'East' },
    { name: 'Henry Walker', organization: 'XYZ Inc', department: 'Sales', district: 'West' },
    { name: 'Isla Thomas', organization: 'XYZ Inc', department: 'HR', district: 'South' },
    { name: 'Chloe Adams', organization: 'XYZ Inc', department: 'IT', district: 'East' },
    { name: 'James Scott', organization: 'XYZ Inc', department: 'Sales', district: 'East' },
    { name: 'Ethan Cooper', organization: 'XYZ Inc', department: 'HR', district: 'Central' },
  ],
};

const IfDialogPopup: React.FC<{ open: boolean; onClose: () => void; onSave: () => void }> = ({
  open,
  onClose,
  onSave,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedVariable, setSelectedVariable] = React.useState<string>('');

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const handleSelectVariable = (variable: string) => {
    setSelectedVariable(variable);
    handleCloseMenu();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}>
        Set Condition(s)
      </DialogTitle>
      <DialogContent sx={{ marginTop: '16px' }}>
        <Grid container spacing={0}>
          {/* Custom Text Field for "IF" */}
          <Box sx={{ width: '100%' }} bgcolor={'#f5f5f5'} p={2} borderRadius={1}>
            <Grid container spacing={0} alignItems="center" width={'100%'}>
              <Grid size={{ lg: 1, md: 1, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  IF
                </Typography>
              </Grid>
              <Grid size={{ lg: 9, md: 9, sm: 9 }}>
                <CustomTextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type or select a variable"
                  value={selectedVariable}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSelectedVariable(e.target.value)
                  }
                />
              </Grid>
              <Grid size={{ lg: 2, md: 2, sm: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  sx={{ height: '100%' }}
                >
                  Variable
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="error">
          Cancel
        </Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IfDialogPopup;
