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
  Menu,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { useTheme } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { Box } from '@mui/system';
import { nodeType } from 'src/store/apps/rules/RulesNodes';

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

const IfDialogPopup: React.FC<{
  nodes: nodeType[];
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}> = ({ nodes, open, onClose, onSave }) => {
  const theme = useTheme();
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  const [selectedCondition, setSelectedCondition] = React.useState<string>('');
  const [selectedValue, setSelectedValue] = React.useState<string>('');
  const [addCondition, setAddCondition] = React.useState<boolean>(false);

  //Second Condition
  const [secondSelectedSubject, setSecondSelectedSubject] = React.useState<string>('');
  const [secondSelectedCondition, setSecondSelectedCondition] = React.useState<string>('');
  const [secondSelectedValue, setSecondSelectedValue] = React.useState<string>('');

  const [logicalOperator, setLogicalOperator] = React.useState<string>('AND'); // Default to AND

  const handleLogicalOperatorChange = (
    event: React.MouseEvent<HTMLElement>,
    newOperator: string | null,
  ) => {
    if (newOperator !== null) {
      setLogicalOperator(newOperator);
    }
  };

  const handleSubjectChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedSubject(event.target.value as string);
    console.log('Selected Subject:', event.target.value);
    setSelectedCondition(''); // Reset condition when subject changes
    setSelectedValue(''); // Reset value when subject changes
  };

  const handleSecondSubjectChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSecondSelectedSubject(event.target.value as string);
    console.log('Selected Second Subject:', event.target.value);
    setSecondSelectedCondition(''); // Reset condition when subject changes
    setSecondSelectedValue(''); // Reset value when subject changes
  };

  const detailsText = (node: nodeType) => {
    if (node.details.startsWith('Choose a')) {
      return node.details;
    }
    const detailsParts = node.details.split(' - ');
    const organizations = detailsParts[0]?.split(',').map((o: string) => o.trim()) || [];
    const departments = detailsParts[1]?.split(',').map((d: string) => d.trim()) || [];
    const districts = detailsParts[2]?.split(',').map((d: string) => d.trim()) || [];
    const members = detailsParts[3]?.split(',').map((m: string) => m.trim()) || [];

    const firstOrganization = organizations[0] || '';
    const extraOrganizations = organizations.length > 1 ? ` +${organizations.length - 1}` : '';
    const firstDepartment = departments[0] || '';
    const extraDepartments = departments.length > 1 ? ` +${departments.length - 1}` : '';
    const firstDistrict = districts[0] || '';
    const extraDistricts = districts.length > 1 ? ` +${districts.length - 1}` : '';
    const firstMember = members[0] || '';
    const extraMembers = members.length > 1 ? ` +${members.length - 1}` : '';

    const formatPart = (first: string, extra: string) => (first ? `${first}${extra}` : '');

    return [
      formatPart(firstOrganization, extraOrganizations),
      formatPart(firstDepartment, extraDepartments),
      formatPart(firstDistrict, extraDistricts),
      formatPart(firstMember, extraMembers),
    ]
      .filter(Boolean)
      .join(' | ');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}>
        Set Condition(s)
      </DialogTitle>
      <DialogContent sx={{ marginTop: '16px' }}>
        <Grid container spacing={0} justifyContent={'center'} alignItems="center">
          <Box sx={{ width: '100%' }} bgcolor={'#f5f5f5'} p={2} borderRadius={1}>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  IF
                </Typography>
              </Grid>
              <Grid size={11}>
                <CustomSelect
                  fullWidth
                  value={selectedSubject}
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) => handleSubjectChange(e)}
                  displayEmpty
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 250,
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select a subject
                  </MenuItem>
                  {nodes.map((node) => (
                    <MenuItem key={node.id} value={node.id}>
                      Node {node.id} - {detailsText(node)}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}></Typography>
              </Grid>
              <Grid size={11}>
                <CustomSelect
                  fullWidth
                  value={selectedCondition}
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                    setSelectedCondition(e.target.value as string)
                  }
                  displayEmpty
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 250,
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select a Condition
                  </MenuItem>
                  <MenuItem value="Equal to">Equal to</MenuItem>
                  <MenuItem value="Not Equal to">Not Equal to</MenuItem>
                  <MenuItem value="Contains">Contains</MenuItem>
                  <MenuItem value="Does Not Contain">Does Not Contain</MenuItem>
                  <MenuItem value="Starts With">Starts With</MenuItem>
                  <MenuItem value="Ends With">Ends With</MenuItem>
                  <MenuItem value="Greater Than">Greater Than</MenuItem>
                  <MenuItem value="Less Than">Less Than</MenuItem>
                </CustomSelect>
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}></Typography>
              </Grid>
              <Grid size={11}>
                <CustomSelect
                  fullWidth
                  value={selectedValue || ''} // Ensure value is always a string
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                    setSelectedValue(e.target.value as string)
                  }
                  displayEmpty
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 250,
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select a variable
                  </MenuItem>
                  {nodes.map((node) => (
                    <MenuItem key={node.id} value={node.id}>
                      Node {node.id} - {detailsText(node)}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Grid>
            </Grid>
          </Box>
          {addCondition ? (
            <>
              <Grid container justifyContent="center" alignItems="center" sx={{ margin: 2 }}>
                <ToggleButtonGroup
                  value={logicalOperator}
                  exclusive
                  onChange={handleLogicalOperatorChange}
                  aria-label="Logical Operator"
                  color="primary"
                >
                  <ToggleButton
                    value="AND"
                    aria-label="AND"
                    sx={{ fontWeight: 'bold', width: '100px' }}
                  >
                    AND
                  </ToggleButton>
                  <ToggleButton
                    value="OR"
                    aria-label="OR"
                    sx={{ fontWeight: 'bold', width: '100px' }}
                  >
                    OR
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Box sx={{ width: '100%' }} bgcolor={'#f5f5f5'} p={2} borderRadius={1}>
                <Grid
                  container
                  spacing={2}
                  justifyContent={'center'}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      IF
                    </Typography>
                  </Grid>
                  <Grid size={11}>
                    <CustomSelect
                      fullWidth
                      value={secondSelectedSubject}
                      onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                        handleSecondSubjectChange(e)
                      }
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: 250,
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select a subject
                      </MenuItem>
                      {nodes.map((node) => (
                        <MenuItem key={node.id} value={node.id}>
                          Node {node.id} - {detailsText(node)}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </Grid>
                </Grid>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}></Typography>
                  </Grid>
                  <Grid size={11}>
                    <CustomSelect
                      fullWidth
                      value={secondSelectedCondition}
                      onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                        setSecondSelectedCondition(e.target.value as string)
                      }
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: 250,
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select a Condition
                      </MenuItem>
                      <MenuItem value="Equal to">Equal to</MenuItem>
                      <MenuItem value="Not Equal to">Not Equal to</MenuItem>
                      <MenuItem value="Contains">Contains</MenuItem>
                      <MenuItem value="Does Not Contain">Does Not Contain</MenuItem>
                      <MenuItem value="Starts With">Starts With</MenuItem>
                      <MenuItem value="Ends With">Ends With</MenuItem>
                      <MenuItem value="Greater Than">Greater Than</MenuItem>
                      <MenuItem value="Less Than">Less Than</MenuItem>
                    </CustomSelect>
                  </Grid>
                </Grid>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Grid size={1} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}></Typography>
                  </Grid>
                  <Grid size={11}>
                    <CustomSelect
                      fullWidth
                      value={secondSelectedValue || ''} // Ensure value is always a string
                      onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                        setSecondSelectedValue(e.target.value as string)
                      }
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: 250,
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select a variable
                      </MenuItem>
                      {nodes.map((node) => (
                        <MenuItem key={node.id} value={node.id}>
                          Node {node.id} - {detailsText(node)}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </Grid>
                </Grid>
                <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
                  <Grid size={12}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setSecondSelectedCondition('');
                        setSecondSelectedValue('');
                        setSecondSelectedSubject('');
                        setAddCondition(false);
                      }}
                    >
                      Delete Condition
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </>
          ) : (
            <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
              <Grid size={12}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setAddCondition(true)}
                  fullWidth
                >
                  + Add Condition
                </Button>
              </Grid>
            </Grid>
          )}
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
