import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';

interface NodePopupProps {
  node: { id: string; name: string; posX: number; posY: number; details: string } | null;
  onClose: () => void;
  onEdit: (nodeId: string, name: string) => void;
  onDelete: (nodeId: string) => void;
  onCreateConnection?: (nodeId: string, e: any) => void; // New prop for creating a connection
}

const NodePopup: React.FC<NodePopupProps> = ({
  node,
  onClose,
  onEdit,
  onDelete,
  onCreateConnection,
}) => {
  if (!node || !node.id || !node.name || node.posX === undefined || node.posY === undefined) {
    return null;
  }

  const [nodeDetails, setNodeDetails] = useState(node.details); // Local state for the name field
  const popupRef = useRef<HTMLDivElement>(null); // Ref for the popup box
  const [popupDimensions, setPopupDimensions] = useState({ width: 200, height: 150 }); // Default dimensions

  const handleDetailsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNodeDetails(event.target.value); // Update the local state
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose(); // Close the popup
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  useEffect(() => {
    // Dynamically calculate popup dimensions after rendering
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPopupDimensions({ width: rect.width, height: rect.height });
      console.log('Popup dimensions:', rect.width, rect.height);
    }
  }, [popupRef]);

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
  const popupStyle = {
    position: 'absolute' as const,
    top: top, // Position below the node
    left: left, // Position slightly to the right of the node
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '10px',
    zIndex: 1000,
  };

  return (
    <Box ref={popupRef} sx={popupStyle}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        Node Details
      </Typography>
      <CustomFormLabel>Details</CustomFormLabel>
      <CustomTextField value={nodeDetails} onChange={handleDetailsChange} fullWidth />
      <Box sx={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Button variant="contained" size="small" onClick={() => onEdit(node.id, nodeDetails)}>
          Edit
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

export default NodePopup;
