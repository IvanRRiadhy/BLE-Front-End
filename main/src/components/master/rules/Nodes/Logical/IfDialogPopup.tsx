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

interface NodeDetails {
  building?: string[];
  floorplan?: string[];
  area?: string[];
  access?: string;
  status?: string[];
  type?: string[];
  visitor?: string[];
  organization?: string[];
  department?: string[];
  district?: string[];
  member?: string[];
}

interface Condition {
  subject: string;
  condition: string;
  value: string;
  operator: string;
}

const IfDialogPopup: React.FC<{
  nodes: nodeType[];
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}> = ({ nodes, open, onClose, onSave }) => {
  const theme = useTheme();
  const [conditions, setConditions] = React.useState<Condition[]>([
    { subject: '', condition: '', value: '', operator: 'AND' },
  ]);

  React.useEffect(() => {
    if (open) {
      const nonStartNodes = nodes.filter((node) => !node.startNode);
      const allConditions: Condition[] = [];

      nonStartNodes.forEach((node) => {
        try {
          const details: NodeDetails = JSON.parse(node.details);

          // Handle organization-related details
          if (details.organization?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.organization), // Convert array to string
              operator: 'AND',
            });
          }
          if (details.department?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.department), // Convert array to string
              operator: 'AND',
            });
          }
          // ... do the same for other fields ...
          if (details.district?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.district),
              operator: 'AND',
            });
          }
          if (details.member?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.member),
              operator: 'AND',
            });
          }
          if (details.building?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.building),
              operator: 'AND',
            });
          }
          if (details.floorplan?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.floorplan),
              operator: 'AND',
            });
          }
          if (details.area?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.area),
              operator: 'AND',
            });
          }
          if (details.status?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.status),
              operator: 'AND',
            });
          }
          if (details.type?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.type),
              operator: 'AND',
            });
          }
          if (details.visitor?.length) {
            allConditions.push({
              subject: ' ',
              condition: 'Equal to',
              value: JSON.stringify(details.visitor),
              operator: 'AND',
            });
          }
        } catch (error) {
          console.error('Error parsing node details:', error);
        }
      });

      if (allConditions.length > 0) {
        setConditions(allConditions);
      }
    }
  }, [open, nodes]);

  const handleSubjectChange = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], subject: value };
    setConditions(newConditions);
  };

  const handleConditionChange = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], condition: value };
    setConditions(newConditions);
  };

  const handleValueChange = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], value: value };
    setConditions(newConditions);
  };

  const handleOperatorChange = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], operator: value };
    setConditions(newConditions);
  };

  const addCondition = () => {
    setConditions([...conditions, { subject: ' ', condition: '', value: '', operator: 'AND' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const detailsText = (node: nodeType) => {
    try {
      const details: NodeDetails = JSON.parse(node.details);
      const parts: string[] = [];

      if (details.building?.length) {
        parts.push(`Building: ${details.building.join(', ')}`);
      }
      if (details.floorplan?.length) {
        parts.push(`Floor: ${details.floorplan.join(', ')}`);
      }
      if (details.area?.length) {
        parts.push(`Area: ${details.area.join(', ')}`);
      }

      return parts.join(' | ');
    } catch {
      return node.details;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}>
        Set Condition(s)
      </DialogTitle>
      <DialogContent sx={{ marginTop: '16px' }}>
        <Grid container spacing={2} direction="column">
          {conditions.map((condition, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <Grid>
                  <Grid container justifyContent="center" alignItems="center">
                    <ToggleButtonGroup
                      value={condition.operator}
                      exclusive
                      onChange={(_, value) => value && handleOperatorChange(index, value)}
                      aria-label="Logical Operator"
                      color="primary"
                    >
                      <ToggleButton value="AND" sx={{ fontWeight: 'bold', width: '100px' }}>
                        AND
                      </ToggleButton>
                      <ToggleButton value="OR" sx={{ fontWeight: 'bold', width: '100px' }}>
                        OR
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                </Grid>
              )}
              <Grid>
                <Box sx={{ width: '100%' }} bgcolor={'#f5f5f5'} p={2} borderRadius={1}>
                  <Grid container spacing={2}>
                    <Grid size={1}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {`IF#${index + 1}`}
                      </Typography>
                    </Grid>
                    <Grid size={11}>
                      <CustomSelect
                        fullWidth
                        value={condition.subject}
                        onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                          handleSubjectChange(index, e.target.value as string)
                        }
                        displayEmpty
                      >
                        <MenuItem value=" " disabled>
                          Select a subject
                        </MenuItem>
                        {nodes
                          .filter((node) => node.startNode === true)
                          .map((node: nodeType) => (
                            <MenuItem key={node.id} value={node.id}>
                              Node {node.id} - {detailsText(node)}
                            </MenuItem>
                          ))}
                      </CustomSelect>
                    </Grid>
                    <Grid size={1} />
                    <Grid size={11}>
                      <CustomSelect
                        fullWidth
                        value={condition.condition}
                        onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                          handleConditionChange(index, e.target.value as string)
                        }
                        displayEmpty
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
                    <Grid size={1} />
                    <Grid size={11}>
                      <CustomSelect
                        fullWidth
                        value={condition.value}
                        onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                          handleValueChange(index, e.target.value as string)
                        }
                        displayEmpty
                        disabled={condition.value.startsWith('[')}
                      >
                        <MenuItem value="" disabled>
                          Select a variable
                        </MenuItem>
                        {condition.value && condition.value.startsWith('[') && (
                          <MenuItem value={condition.value}>
                            {JSON.parse(condition.value).join(', ')}
                          </MenuItem>
                        )}
                      </CustomSelect>
                    </Grid>
                    {index > 0 && (
                      <Grid size={12}>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => removeCondition(index)}
                        >
                          Delete Condition
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Grid>
            </React.Fragment>
          ))}
          <Grid>
            <Button variant="outlined" color="primary" onClick={addCondition} fullWidth>
              + Add Condition
            </Button>
          </Grid>
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
