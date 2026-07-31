import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  CircularProgress,
  Autocomplete,
  TextField,
  Box,
  Popover,
} from '@mui/material';
import { IconRadio, IconPlus, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { EngineType } from 'src/store/apps/crud/engine';
import { bleReaderType } from 'src/store/apps/crud/bleReader';
import { useAssignReaders } from 'src/hooks/useEngine';
import { useAllUnassignedReadersByEngine } from 'src/hooks/useReader';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  engine: EngineType;
}

const AssignReaderDialog: React.FC<Props> = ({ engine }) => {
  const [open, setOpen] = useState(false);
  const [assignedReaders, setAssignedReaders] = useState<bleReaderType[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedAddReader, setSelectedAddReader] = useState<bleReaderType | null>(null);

  const assignMutation = useAssignReaders();
  const queryClient = useQueryClient();

  const { data: unassignedReaders = [], isLoading: isLoadingUnassigned } =
    useAllUnassignedReadersByEngine();

  const handleOpen = () => {
    setAssignedReaders(engine.bleReaders || []);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
    setSelectedAddReader(null);
  };

  useEffect(() => {
    if (open) {
      setAssignedReaders(engine.bleReaders || []);
    }
  }, [engine, open]);

  // Combine unassigned readers + current engine readers for Autocomplete options
  const addOptions = useMemo(() => {
    const currentEngineReaders = engine.bleReaders || [];
    const combined = [...unassignedReaders, ...currentEngineReaders];
    // Remove duplicates by ID if any
    const map = new Map<string, bleReaderType>();
    combined.forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [unassignedReaders, engine.bleReaders]);

  // Available options to select (exclude ones already in current assigned list state)
  const availableOptions = useMemo(() => {
    const assignedIds = new Set(assignedReaders.map((r) => r.id));
    return addOptions.filter((r) => !assignedIds.has(r.id));
  }, [addOptions, assignedReaders]);

  const handleRemoveReader = (readerId: string) => {
    setAssignedReaders((prev) => prev.filter((r) => r.id !== readerId));
  };

  const handleOpenAddPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseAddPopover = () => {
    setAnchorEl(null);
    setSelectedAddReader(null);
  };

  const handleAddReaderConfirm = () => {
    if (selectedAddReader) {
      setAssignedReaders((prev) => [...prev, selectedAddReader]);
      setSelectedAddReader(null);
      setAnchorEl(null);
    }
  };

  const handleSave = async () => {
    try {
      const readerIds = assignedReaders.map((r) => r.id);
      await assignMutation.mutateAsync({ engineId: engine.id, readerIds });
      await queryClient.invalidateQueries({ queryKey: ['engine-list'] });
      toast.success('Readers assigned successfully');
      handleClose();
    } catch (error) {
      toast.error('Failed to assign readers');
      console.error(error);
    }
  };

  const isPopoverOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Assign Reader">
        <IconButton color="primary" size="small" onClick={handleOpen}>
          <IconRadio size={20} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h5">Assign Readers ({engine.name})</Typography>
          <Tooltip title="Add Reader">
            <IconButton color="primary" onClick={handleOpenAddPopover}>
              <IconPlus size={20} />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <Popover
          open={isPopoverOpen}
          anchorEl={anchorEl}
          onClose={handleCloseAddPopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { p: 2, width: 300 },
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select Reader to Add
          </Typography>
          <Autocomplete
            size="small"
            options={availableOptions}
            loading={isLoadingUnassigned}
            getOptionLabel={(option) => option.name || option.gmac || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedAddReader}
            onChange={(_, newValue) => setSelectedAddReader(newValue)}
            renderInput={(params) => <TextField {...params} placeholder="Search Reader..." />}
            sx={{ mb: 1.5 }}
          />
          <Box display="flex" justifyContent="end" gap={1}>
            <Button size="small" onClick={handleCloseAddPopover}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!selectedAddReader}
              onClick={handleAddReaderConfirm}
            >
              Add
            </Button>
          </Box>
        </Popover>

        <DialogContent dividers>
          {assignedReaders.length === 0 ? (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
              No readers assigned to this engine.
            </Typography>
          ) : (
            <List disablePadding>
              {assignedReaders.map((reader) => (
                <ListItem
                  key={reader.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                  }}
                >
                  <ListItemText primary={reader.name || reader.gmac} />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveReader(reader.id)}
                  >
                    <IconX size={18} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            disabled={assignMutation.isPending}
            startIcon={assignMutation.isPending ? <CircularProgress size={18} /> : null}
          >
            {assignMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignReaderDialog;
