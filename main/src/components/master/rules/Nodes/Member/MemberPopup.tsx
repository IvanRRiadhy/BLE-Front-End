import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Divider,
  Grid2 as Grid,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface NodePopupProps {
  node: { id: string; name: string; posX: number; posY: number; details: string } | null;
  onClose: () => void;
  onEdit: (nodeId: string, name: string) => void;
  onDelete: (nodeId: string) => void;
  onCreateConnection?: (nodeId: string, e: any) => void; // New prop for creating a connection
}

const members = [
  // ABC Corp (10 members)
  { name: 'John Doe', organization: 'ABC Corp', department: 'Engineering', district: 'North' },
  { name: 'Emma Wilson', organization: 'ABC Corp', department: 'Engineering', district: 'North' },
  { name: 'Liam Brooks', organization: 'ABC Corp', department: 'Marketing', district: 'South' },
  { name: 'Olivia Harris', organization: 'ABC Corp', department: 'Marketing', district: 'South' },
  { name: 'Sophia Bennett', organization: 'ABC Corp', department: 'Operations', district: 'East' },
  { name: 'Lucas Gray', organization: 'ABC Corp', department: 'Finance', district: 'West' },
  { name: 'Nora Parker', organization: 'ABC Corp', department: 'Finance', district: 'West' },
  { name: 'Ethan Lee', organization: 'ABC Corp', department: 'Engineering', district: 'East' },
  { name: 'Amelia Reed', organization: 'ABC Corp', department: 'Operations', district: 'North' },
  { name: 'Charlie Davis', organization: 'ABC Corp', department: 'Operations', district: 'North' },

  // XYZ Inc (10 members)
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
];

const organizations = [{ name: 'ABC Corp' }, { name: 'XYZ Inc' }];

const departments = [
  { name: 'Engineering' },
  { name: 'Marketing' },
  { name: 'Sales' },
  { name: 'HR' },
];

const districts = [{ name: 'North' }, { name: 'South' }, { name: 'East' }, { name: 'West' }];

const MemberNodePopup: React.FC<NodePopupProps> = ({
  node,
  onClose,
  onEdit,
  onDelete,
  onCreateConnection,
}) => {
  if (!node || !node.id || !node.name || node.posX === undefined || node.posY === undefined) {
    return null;
  }

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const popupRef = useRef<HTMLDivElement>(null); // Ref for the popup box

  const [popupDimensions, setPopupDimensions] = useState({ width: 200, height: 150 });
  // Update parseMemberDetails to handle multiple selections
  const parseMemberDetails = (details: string) => {
    if (!details || details.startsWith('Choose a')) {
      return { organization: [], department: [], district: [], member: [] };
    }

    try {
      // Parse the JSON string
      const parsedDetails = JSON.parse(details);
      return {
        organization: parsedDetails.organization || [],
        department: parsedDetails.department || [],
        district: parsedDetails.district || [],
        member: parsedDetails.member || [],
      };
    } catch (error) {
      console.error('Error parsing details:', error);
      return { organization: [], department: [], district: [], member: [] };
    }
  };

  // Initialize formData with the updated parseMemberDetails
  const [formData, setFormData] = useState(() => parseMemberDetails(node.details || ''));
  useEffect(() => {
    // Dynamically calculate popup dimensions after rendering
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPopupDimensions({ width: rect.width, height: rect.height });
      console.log('Popup dimensions:', rect.width, rect.height);
    }
  }, [popupRef]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.MuiPopover-root')
      ) {
        onClose(); // Close the popup
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const canvas = document.querySelector('.konvajs-content') as HTMLElement;
  const canvasWidth = canvas?.offsetWidth - 315 || 800; // Default to 800 if canvas is not found
  const canvasHeight = canvas?.offsetHeight || 600; // Default to 600 if canvas is not found
  // Calculate popup position
  let top = Math.max(node.posY + 60, 15); // Position below the node
  let left = Math.max(node.posX + 20, 15); // Position slightly to the right of the node

  // Adjust if the popup goes beyond the canvas bounds
  if (top + popupDimensions.height > canvasHeight) {
    top = canvasHeight - popupDimensions.height - 10; // Adjust to stay within the bottom edge
  }
  if (left + popupDimensions.width > canvasWidth) {
    left = canvasWidth - popupDimensions.width - 10; // Adjust to stay within the right edge
  }
  // Calculate initial popup position
  useEffect(() => {
    let initialTop = Math.max(node.posY + 60, 15);
    let initialLeft = Math.max(node.posX + 20, 15);

    if (initialTop + popupDimensions.height > canvasHeight) {
      initialTop = canvasHeight - popupDimensions.height - 10;
    }
    if (initialLeft + popupDimensions.width > canvasWidth) {
      initialLeft = canvasWidth - popupDimensions.width - 10;
    }

    setPosition({ x: initialLeft, y: initialTop });
  }, [node.posX, node.posY, canvasHeight, canvasWidth, popupDimensions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(newX, canvasWidth - popupDimensions.width));
      newY = Math.max(0, Math.min(newY, canvasHeight - popupDimensions.height));

      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const popupStyle = {
    position: 'absolute' as const,
    width: '600px',
    top: position.y, // Position below the node
    left: position.x, // Position slightly to the right of the node
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '10px',
    zIndex: 1000,
    cursor: isDragging ? 'grabbing' : 'default',
  };

  // Filter departments based on selected organization
  const filteredDepartments = departments.filter((dpt) =>
    formData.organization && formData.organization.length > 0
      ? members.some(
          (m) => formData.organization.includes(m.organization) && m.department === dpt.name,
        )
      : true,
  );

  // Filter districts based on selected organization and department
  const filteredDistricts = districts.filter((dist) =>
    formData.organization && formData.department
      ? members.some(
          (m) =>
            formData.organization.includes(m.organization) &&
            formData.department.includes(m.department) &&
            m.district === dist.name,
        )
      : true,
  );
  // Filter members based on selected organization, department, and district
  const filteredMembers = members.filter((member) => {
    return (
      (!formData.organization ||
        formData.organization.length === 0 ||
        formData.organization.includes(member.organization)) &&
      (!formData.department ||
        formData.department.length === 0 ||
        formData.department.includes(member.department)) &&
      (!formData.district ||
        formData.district.length === 0 ||
        formData.district.includes(member.district))
    );
  });

  return (
    <Box ref={popupRef} sx={popupStyle}>
      <Box
        className="drag-handle"
        sx={{
          height: '30px',
          marginBottom: '10px',
          cursor: 'grab',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
        onMouseDown={handleMouseDown}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Node Details
        </Typography>
      </Box>
      <Divider />
      <Grid container spacing={1} mb={0}>
        <Grid size={{ lg: 4, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Organization</CustomFormLabel>
          <CustomSelect
            name="organization"
            value={formData.organization}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  organization:
                    formData.organization.length === organizations.length
                      ? [] // Clear selection if all are already selected
                      : organizations.map((org) => org.name), // Select all organizations
                  department: [], // Reset dependent fields
                  district: [], // Reset dependent fields
                  member: [], // Reset dependent fields
                }));
                return;
              }
              setFormData((prev) => ({
                ...prev,
                organization: value,
                department: [], // Reset dependent fields
                district: [], // Reset dependent fields
                member: [], // Reset dependent fields
              }));
            }}
            fullWidth
            variant="outlined"
            multiple
            renderValue={(selected: string[]) => selected.join(', ')}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 200,
                  width: 200,
                },
              },
            }}
          >
            <MenuItem value="all">
              <ListItemIcon>
                <Checkbox
                  checked={formData.organization.length === organizations.length}
                  indeterminate={
                    formData.organization.length > 0 &&
                    formData.organization.length < organizations.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {organizations.map((org, index) => (
              <MenuItem key={index} value={org.name}>
                <ListItemIcon>
                  <Checkbox checked={formData.organization.includes(org.name)} />
                </ListItemIcon>
                <ListItemText primary={org.name} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
        {/* Department Select */}
        <Grid size={{ lg: 4, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Department</CustomFormLabel>
          <CustomSelect
            name="department"
            value={formData.department}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  department:
                    formData.department.length === departments.length
                      ? [] // Clear selection if all are already selected
                      : departments.map((dpt) => dpt.name), // Select all departments
                  // district: [], // Reset dependent fields
                  // member: [], // Reset dependent fields
                }));
                return;
              }
              setFormData((prev) => ({
                ...prev,
                department: value,
                district: [], // Reset dependent fields
                member: [], // Reset dependent fields
              }));
            }}
            fullWidth
            variant="outlined"
            multiple
            renderValue={(selected: string[]) => selected.join(', ')}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 200,
                  width: 200,
                },
              },
            }}
          >
            <MenuItem value="all">
              <ListItemIcon>
                <Checkbox
                  checked={formData.department.length === departments.length}
                  indeterminate={
                    formData.department.length > 0 &&
                    formData.department.length < departments.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {departments.map((dpt, index) => (
              <MenuItem key={index} value={dpt.name}>
                <ListItemIcon>
                  <Checkbox checked={formData.department.includes(dpt.name)} />
                </ListItemIcon>
                <ListItemText primary={dpt.name} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
        {/* District Select */}
        <Grid size={{ lg: 4, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>District</CustomFormLabel>
          <CustomSelect
            name="district"
            value={formData.district}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  district:
                    formData.district.length === districts.length
                      ? [] // Clear selection if all are already selected
                      : districts.map((dist) => dist.name), // Select all districts
                  // member: [], // Reset dependent fields
                }));
                return;
              }
              setFormData((prev) => ({
                ...prev,
                district: value,
                member: [], // Reset dependent fields
              }));
            }}
            fullWidth
            variant="outlined"
            multiple
            renderValue={(selected: string[]) => selected.join(', ')}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 200,
                  width: 200,
                },
              },
            }}
          >
            <MenuItem value="all">
              <ListItemIcon>
                <Checkbox
                  checked={formData.district.length === districts.length}
                  indeterminate={
                    formData.district.length > 0 && formData.district.length < districts.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {districts.map((dist, index) => (
              <MenuItem key={index} value={dist.name}>
                <ListItemIcon>
                  <Checkbox checked={formData.district.includes(dist.name)} />
                </ListItemIcon>
                <ListItemText primary={dist.name} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
        {/* Member Select (Visible only if district is selected) */}
        {formData.organization && formData.department && formData.district && (
          <Grid size={{ lg: 12, md: 12, sm: 12 }} direction={'column'}>
            <CustomFormLabel>Member</CustomFormLabel>
            <CustomSelect
              name="member"
              value={formData.member}
              onChange={(e: any) => {
                const value = e.target.value as string[];
                if (value.includes('all')) {
                  setFormData((prev) => ({
                    ...prev,
                    member:
                      formData.member.length === filteredMembers.length
                        ? [] // Clear selection if all are already selected
                        : filteredMembers.map((member) => member.name), // Select all members
                  }));
                  return;
                }
                setFormData((prev) => ({
                  ...prev,
                  member: value,
                }));
              }}
              fullWidth
              variant="outlined"
              multiple
              renderValue={(selected: string[]) => selected.join(', ')}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200,
                    width: 200,
                  },
                },
              }}
            >
              <MenuItem value="all">
                <ListItemIcon>
                  <Checkbox
                    checked={formData.member.length === filteredMembers.length}
                    indeterminate={
                      formData.member.length > 0 && formData.member.length < filteredMembers.length
                    }
                  />
                </ListItemIcon>
                <ListItemText primary="Select All" />
              </MenuItem>
              {filteredMembers.map((member, index) => (
                <MenuItem key={index} value={member.name}>
                  <ListItemIcon>
                    <Checkbox checked={formData.member.includes(member.name)} />
                  </ListItemIcon>
                  <ListItemText primary={member.name} />
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        )}
      </Grid>
      {/* <CustomFormLabel>Details</CustomFormLabel>
      <CustomTextField value={nodeDetails} onChange={handleDetailsChange} fullWidth /> */}

      <Box sx={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Button
          variant="contained"
          size="small"
          // In the Button onClick handler
          onClick={() => {
            const { organization, department, district, member } = formData;
            const detailsJson = JSON.stringify({
              organization,
              department,
              district,
              member,
            });
            onEdit(node.id, detailsJson);
            console.log(`Updated Node ${node.id}:`, detailsJson);
          }}
        >
          Save
        </Button>
        <Button variant="outlined" size="small" onClick={onClose}>
          Close
        </Button>
        <Button variant="outlined" color="error" size="small" onClick={() => onDelete(node.id)}>
          Delete
        </Button>
        {onCreateConnection && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const stage = (document.querySelector('.konvajs-content') as any).__konvaNode;
              onCreateConnection(node.id, stage); // Call the function to create a connection
              onClose(); // Close the popup after creating the connection
            }}
          >
            Create Connection
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default MemberNodePopup;
