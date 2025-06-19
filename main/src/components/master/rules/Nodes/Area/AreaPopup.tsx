import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Divider,
  Grid2 as Grid,
  Checkbox,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface NodePopupProps {
  node: {
    id: string;
    name: string;
    posX: number;
    posY: number;
    details: string;
    extraDetails?: string;
  } | null;
  onClose: () => void;
  onEdit: (nodeId: string, details: string, extraDetails: string) => void;
  onDelete: (nodeId: string) => void;
  onCreateConnection?: (nodeId: string, e: any) => void; // New prop for creating a connection
}

const areas = [
  // Alpha Tower (10 areas total)
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

  // Beta Complex (10 areas total)
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
];

const allBuildings = Array.from(new Set(areas.map((area) => area.building)));
const allFloorplans = Array.from(new Set(areas.map((area) => area.floorplan)));
const AreaNodePopup: React.FC<NodePopupProps> = ({
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
  // Parse node.details
  const parseAreaDetails2 = (details: string, extraDetails: string) => {
    if (!details || details.startsWith('Choose a')) {
      return {
        building: [],
        floorplan: [],
        area: [],
        extraDetails: '',
      };
    }

    try {
      // Parse the JSON string
      const parsedDetails = JSON.parse(details);
      return {
        building: parsedDetails.building || [],
        floorplan: parsedDetails.floorplan || [],
        area: parsedDetails.area || [],
        extraDetails: parsedDetails.access || extraDetails || '',
      };
    } catch (error) {
      console.error('Error parsing details:', error);
      return {
        building: [],
        floorplan: [],
        area: [],
        extraDetails: '',
      };
    }
  };

  useEffect(() => {
    // Dynamically calculate popup dimensions after rendering
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPopupDimensions({ width: rect.width, height: rect.height });
      console.log('Popup dimensions:', rect.width, rect.height);
    }
  }, [popupRef]);

  const [formData, setFormData] = useState(() =>
    parseAreaDetails2(node.details || '', node.extraDetails || ''),
  );
  const filteredAreas = areas.filter(
    (area) =>
      (node.details?.includes(area.building) ||
        formData.building.length === 0 ||
        formData.building.includes(area.building)) &&
      (formData.floorplan.length === 0 || formData.floorplan.includes(area.floorplan)),
  );

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
  // Filter floorplans based on selected building
  const filteredFloorplans = Array.from(
    new Set(
      areas
        .filter(
          (area) => formData.building.length === 0 || formData.building.includes(area.building),
        )
        .map((area) => area.floorplan),
    ),
  );

  return (
    <Box ref={popupRef} sx={popupStyle} onMouseDown={(e: any) => e.stopPropagation()}>
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
        <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Building</CustomFormLabel>
          <CustomSelect
            name="building"
            value={formData.building}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  building:
                    formData.building.length === allBuildings.length
                      ? [] // Clear selection if all are already selected
                      : allBuildings, // Select all buildings
                  // floorplan: [], // Reset dependent fields
                  // area: [], // Reset dependent fields
                }));
                return;
              }
              setFormData((prev) => ({
                ...prev,
                building: value,
                floorplan: [],
                area: [],
              }));
            }}
            fullWidth
            variant="outlined"
            multiple
            renderValue={(selected: string[]) => selected.join(', ')}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 200, // Set the maximum height of the dropdown menu
                  width: 100, // Adjust the width of the dropdown menu
                },
              },
            }}
          >
            <MenuItem value="all">
              <ListItemIcon>
                <Checkbox
                  checked={formData.building.length === allBuildings.length}
                  indeterminate={
                    formData.building.length > 0 && formData.building.length < allBuildings.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {allBuildings.map((building, index) => (
              <MenuItem key={index} value={building}>
                <ListItemIcon>
                  <Checkbox checked={formData.building.includes(building)} />
                </ListItemIcon>
                <ListItemText primary={building} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
        {/* Department Select (Visible only if organization is selected) */}
        {formData.building && (
          <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
            <CustomFormLabel>Floorplan</CustomFormLabel>
            <CustomSelect
              name="floorplan"
              value={formData.floorplan}
              onChange={(e: any) => {
                const value = e.target.value as string[];
                if (value.includes('all')) {
                  setFormData((prev) => ({
                    ...prev,
                    floorplan:
                      formData.floorplan.length === allFloorplans.length
                        ? [] // Clear selection if all are already selected
                        : allFloorplans, // Select all floorplans
                    area: [], // Reset dependent fields
                  }));
                  return;
                }
                setFormData((prev) => ({
                  ...prev,
                  floorplan: value,
                  area: [], // Reset dependent fields
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
                    checked={formData.floorplan.length === allFloorplans.length}
                    indeterminate={
                      formData.floorplan.length > 0 &&
                      formData.floorplan.length < allFloorplans.length
                    }
                  />
                </ListItemIcon>
                <ListItemText primary="Select All" />
              </MenuItem>
              {allFloorplans.map((floorplan, index) => (
                <MenuItem key={index} value={floorplan}>
                  <ListItemIcon>
                    <Checkbox checked={formData.floorplan.includes(floorplan)} />
                  </ListItemIcon>
                  <ListItemText primary={floorplan} />
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        )}
        {/* Member Select (Visible only if district is selected) */}
        {formData.building && formData.floorplan && (
          <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
            <CustomFormLabel>Area</CustomFormLabel>
            <CustomSelect
              name="area"
              value={formData.area}
              onChange={(e: any) => {
                const value = e.target.value as string[];
                if (value[value.length - 1] === 'all') {
                  // Toggle "Select All" functionality
                  setFormData((prev) => ({
                    ...prev,
                    area:
                      formData.area.length === filteredAreas.length
                        ? []
                        : filteredAreas.map((area) => area.area),
                  }));
                  return;
                }
                setFormData((prev) => ({
                  ...prev,
                  area: value, // Update the selected areas
                }));
              }}
              fullWidth
              variant="outlined"
              multiple
              renderValue={(selected: string[]) => (selected as string[]).join(', ')} // Display selected values as a comma-separated string
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200, // Set the maximum height of the dropdown menu
                    width: 200, // Adjust the width of the dropdown menu
                  },
                },
              }}
            >
              {/* Add All Button as a MenuItem */}
              <MenuItem value="all">
                <ListItemIcon>
                  <Checkbox
                    checked={
                      formData.area.length === filteredAreas.length && filteredAreas.length > 0
                    }
                    indeterminate={
                      formData.area.length > 0 && formData.area.length < filteredAreas.length
                    }
                  />
                </ListItemIcon>
                <ListItemText primary="Select All" />
              </MenuItem>

              {/* Render Area Options */}
              {filteredAreas.map((area, index) => (
                <MenuItem key={index} value={area.area}>
                  <ListItemIcon>
                    <Checkbox checked={(formData.area as string[]).includes(area.area)} />
                  </ListItemIcon>
                  <ListItemText primary={area.area} />
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        )}
        {formData.building && formData.floorplan && (
          <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
            <CustomFormLabel>Access</CustomFormLabel>
            <CustomSelect
              name="extraDetails"
              value={formData.extraDetails} // Default to an empty string if not set
              onChange={(e: any) => {
                const value = e.target.value as string;
                setFormData((prev) => ({
                  ...prev,
                  extraDetails: value, // Update the access control value
                }));
              }}
              fullWidth
              variant="outlined"
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200, // Set the maximum height of the dropdown menu
                    width: 200, // Adjust the width of the dropdown menu
                  },
                },
              }}
            >
              <MenuItem value="Restrict">Restrict</MenuItem>
              <MenuItem value="Allow">Allow</MenuItem>
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
          onClick={() => {
            const { building, floorplan, area, extraDetails } = formData;
            const detailsJson = JSON.stringify({
              building,
              floorplan,
              area,
              access: extraDetails,
            });
            onEdit(node.id, detailsJson, extraDetails);
            console.log(`Edited Node ${node.id}:`, detailsJson);
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

export default AreaNodePopup;
