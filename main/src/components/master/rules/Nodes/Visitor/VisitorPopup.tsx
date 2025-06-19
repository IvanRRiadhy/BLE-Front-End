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
  onCreateConnection?: (nodeId: string, e: any) => void;
}

const visitors = [
  { name: 'John Walt', type: 'Guest', status: 'waiting' },
  { name: 'Lili Gant', type: 'VIP', status: 'checkin' },
  { name: 'Mark Twain', type: 'Delivery', status: 'waiting' },
  { name: 'Sara Bright', type: 'Supplier', status: 'checkin' },
  { name: 'Tom Hardy', type: 'Maintenance', status: 'checkout' },
  { name: 'Emma Stone', type: 'VIP', status: 'checkin' },
  { name: 'George King', type: 'Guest', status: 'checkout' },
  { name: 'Nina Hart', type: 'Delivery', status: 'denied' },
  { name: 'Brian Kent', type: 'Maintenance', status: 'checkin' },
  { name: 'Linda Moore', type: 'Guest', status: 'block' },
  { name: 'Oscar Hale', type: 'Supplier', status: 'waiting' },
  { name: 'Ivy Rhodes', type: 'VIP', status: 'checkin' },
  { name: 'Jack Perry', type: 'Delivery', status: 'checkout' },
  { name: 'Anna Frost', type: 'Guest', status: 'checkin' },
  { name: 'Ethan Woods', type: 'Maintenance', status: 'waiting' },
];

const visitorTypes = ['Guest', 'VIP', 'Delivery', 'Supplier', 'Maintenance'];
const visitorStatuses = ['waiting', 'checkin', 'checkout', 'denied', 'block'];

const parseVisitorDetails = (details: string) => {
  if (!details || details.startsWith('Choose a')) {
    return { status: [], type: [], visitor: [] };
  }

  try {
    // Parse the JSON string
    const parsedDetails = JSON.parse(details);
    return {
      status: parsedDetails.status || [],
      type: parsedDetails.type || [],
      visitor: parsedDetails.visitor || [],
    };
  } catch (error) {
    console.error('Error parsing details:', error);
    return { status: [], type: [], visitor: [] };
  }
};

const VisitorNodePopup: React.FC<NodePopupProps> = ({
  node,
  onClose,
  onEdit,
  onDelete,
  onCreateConnection,
}) => {
  if (!node || !node.id || !node.name || node.posX === undefined || node.posY === undefined)
    return null;

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupDimensions, setPopupDimensions] = useState({ width: 200, height: 150 });
  const [formData, setFormData] = useState(() => parseVisitorDetails(node.details || ''));

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPopupDimensions({ width: rect.width, height: rect.height });
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
  const canvasWidth = canvas?.offsetWidth - 315 || 800;
  const canvasHeight = canvas?.offsetHeight || 600;

  useEffect(() => {
    let top = Math.max(node.posY + 60, 15);
    let left = Math.max(node.posX + 20, 15);
    if (top + popupDimensions.height > canvasHeight)
      top = canvasHeight - popupDimensions.height - 10;
    if (left + popupDimensions.width > canvasWidth) left = canvasWidth - popupDimensions.width - 10;
    setPosition({ x: left, y: top });
  }, [node.posX, node.posY, canvasHeight, canvasWidth, popupDimensions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      let newX = Math.max(
        0,
        Math.min(e.clientX - dragStart.x, canvasWidth - popupDimensions.width),
      );
      let newY = Math.max(
        0,
        Math.min(e.clientY - dragStart.y, canvasHeight - popupDimensions.height),
      );
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

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
    top: position.y,
    left: position.x,
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '10px',
    zIndex: 1000,
    cursor: isDragging ? 'grabbing' : 'default',
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      (!formData.status.length || formData.status.includes(v.status)) &&
      (!formData.type.length || formData.type.includes(v.type)),
  );

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
          '&:active': { cursor: 'grabbing' },
        }}
        onMouseDown={handleMouseDown}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 'bold', userSelect: 'none', pointerEvents: 'none' }}
        >
          Visitor Node Details
        </Typography>
      </Box>
      <Divider />
      <Grid container spacing={1}>
        <Grid size={{ lg: 4, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Status</CustomFormLabel>
          <CustomSelect
            name="status"
            value={formData.status}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  status:
                    formData.status.length === visitorStatuses.length
                      ? []
                      : visitorStatuses.map((status) => status),
                  visitor: [],
                }));
                return;
              }
              setFormData({ ...formData, status: value, visitor: [] });
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
                  checked={formData.status.length === visitorStatuses.length}
                  indeterminate={
                    formData.status.length > 0 && formData.status.length < visitorStatuses.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {visitorStatuses.map((status, index) => (
              <MenuItem key={index} value={status}>
                <ListItemIcon>
                  <Checkbox checked={formData.status.includes(status)} />
                </ListItemIcon>
                <ListItemText primary={status} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
        <Grid size={{ lg: 4, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Type</CustomFormLabel>
          <CustomSelect
            name="type"
            value={formData.type}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  type:
                    formData.type.length === visitorTypes.length
                      ? []
                      : visitorTypes.map((type) => type),
                  visitor: [],
                }));
                return;
              }
              setFormData({ ...formData, type: value, visitor: [] });
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
                  checked={formData.type.length === visitorTypes.length}
                  indeterminate={
                    formData.type.length > 0 && formData.type.length < visitorTypes.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {visitorTypes.map((type, index) => (
              <MenuItem key={index} value={type}>
                <ListItemIcon>
                  <Checkbox checked={formData.type.includes(type)} />
                </ListItemIcon>
                <ListItemText primary={type} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
        <Grid size={{ lg: 4, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Visitor</CustomFormLabel>
          <CustomSelect
            name="visitor"
            value={formData.visitor}
            onChange={(e: any) => {
              const value = e.target.value as string[];
              if (value.includes('all')) {
                setFormData((prev) => ({
                  ...prev,
                  visitor:
                    formData.visitor.length === filteredVisitors.length
                      ? []
                      : filteredVisitors.map((visitor) => visitor.name),
                }));
                return;
              }
              setFormData({ ...formData, visitor: value });
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
                  checked={formData.visitor.length === filteredVisitors.length}
                  indeterminate={
                    formData.visitor.length > 0 && formData.visitor.length < filteredVisitors.length
                  }
                />
              </ListItemIcon>
              <ListItemText primary="Select All" />
            </MenuItem>
            {filteredVisitors.map((visitor, index) => (
              <MenuItem key={index} value={visitor.name}>
                <ListItemIcon>
                  <Checkbox checked={formData.visitor.includes(visitor.name)} />
                </ListItemIcon>
                <ListItemText primary={visitor.name} />
              </MenuItem>
            ))}
          </CustomSelect>
        </Grid>
      </Grid>
      <Box sx={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            const { status, type, visitor } = formData;
            const detailsJson = JSON.stringify({
              status,
              type,
              visitor,
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
              onCreateConnection(node.id, stage);
              onClose();
            }}
          >
            Create Connection
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default VisitorNodePopup;
