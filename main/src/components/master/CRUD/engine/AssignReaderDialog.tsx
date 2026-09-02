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
  Box,
  Popover,
} from '@mui/material';
import { IconRadio, IconPlus, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { EngineType } from 'src/store/apps/crud/engine';
import { useAssignReaders } from 'src/hooks/useEngine';
import {
  useGetAllUnasignedEngine,
  UnassignedEngineReader,
} from 'src/hooks/useFloorplanDevice';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import AreaHierarchySelector, {
  SelectedNode,
} from 'src/components/shared/AreaHierarchySelector';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  engine: EngineType;
}

const AssignReaderDialog: React.FC<Props> = ({ engine }) => {
  const [open, setOpen] = useState(false);
  const [assignedReaders, setAssignedReaders] = useState<UnassignedEngineReader[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedDeviceNodesToAdd, setSelectedDeviceNodesToAdd] = useState<SelectedNode[]>([]);

  const assignMutation = useAssignReaders();
  const queryClient = useQueryClient();

  // Readers queries from useGetAllUnasignedEngine
  const { data: engineReaders = [], isLoading: isLoadingEngineReaders } =
    useGetAllUnasignedEngine(engine.id);
  const { data: unassignedReaders = [], isLoading: isLoadingUnassigned } =
    useGetAllUnasignedEngine();

  // Hierarchy queries
  const { data: buildings = [] } = useAllBuilding();
  const { data: floors = [] } = useAllFloors();
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: maskedAreas = [] } = useAllMaskedAreas();

  // Combine and deduplicate readers
  const allReaders = useMemo(() => {
    const map = new Map<string, UnassignedEngineReader>();
    (engineReaders || []).forEach((r) => {
      if (r.readerId) map.set(r.readerId, r);
    });
    (unassignedReaders || []).forEach((r) => {
      if (r.readerId && !map.has(r.readerId)) map.set(r.readerId, r);
    });
    return Array.from(map.values());
  }, [engineReaders, unassignedReaders]);

  const handleOpen = () => {
    const current = allReaders.filter((r) => r.currentEngineId === engine.id);
    setAssignedReaders(current);
    setSelectedDeviceNodesToAdd([]);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
    setSelectedDeviceNodesToAdd([]);
  };


  useEffect(() => {
    if (open) {
      const current = allReaders.filter((r) => r.currentEngineId === engine.id);
      setAssignedReaders(current);
    }
  }, [open, allReaders, engine.id]);

  // Available options to select (exclude ones already in current assigned list state)
  const availableDevices = useMemo(() => {
    const assignedIds = new Set(assignedReaders.map((r) => r.readerId));
    return allReaders.filter((r) => !assignedIds.has(r.readerId));
  }, [allReaders, assignedReaders]);

  const handleRemoveReader = (readerId: string) => {
    setAssignedReaders((prev) => prev.filter((r) => r.readerId !== readerId));
  };

  const isDropdownOpenRef = React.useRef(false);
  const dropdownClosedAtRef = React.useRef<number>(0);

  const handleDropdownOpenChange = (isOpen: boolean) => {
    if (!isOpen && isDropdownOpenRef.current) {
      dropdownClosedAtRef.current = Date.now();
    }
    isDropdownOpenRef.current = isOpen;
  };

  const handleOpenAddPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedDeviceNodesToAdd([]);
    setAnchorEl(event.currentTarget);
  };

  const handleCloseAddPopover = () => {
    setAnchorEl(null);
    setSelectedDeviceNodesToAdd([]);
  };

  const handlePopoverClose = () => {
    if (isDropdownOpenRef.current || Date.now() - dropdownClosedAtRef.current < 250) {
      return;
    }
    handleCloseAddPopover();
  };

  const handleAddSelectedDevicesConfirm = () => {
    const newDevices = selectedDeviceNodesToAdd
      .filter((n): n is { type: 'device'; data: any } => n?.type === 'device' && Boolean(n.data))
      .map((n) => n.data as UnassignedEngineReader);

    if (newDevices.length > 0) {
      setAssignedReaders((prev) => {
        const existingIds = new Set(prev.map((r) => r.readerId));
        const toAdd = newDevices.filter((d) => !existingIds.has(d.readerId));
        return [...prev, ...toAdd];
      });
      handleCloseAddPopover();
    }
  };

  const handleSave = async () => {
    try {
      const readerIds = assignedReaders.map((r) => r.readerId);
      await assignMutation.mutateAsync({ engineId: engine.id, readerIds });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['engine-list'] }),
        queryClient.invalidateQueries({ queryKey: ['allEngine'] }),
        queryClient.invalidateQueries({
          queryKey: ['floorplan-device-unassigned-engine'],
        }),
      ]);
      toast.success('Readers assigned successfully');
      handleClose();
    } catch (error) {
      toast.error('Failed to assign readers');
      console.error(error);
    }
  };

  const isPopoverOpen = Boolean(anchorEl);
  const isLoading = isLoadingEngineReaders || isLoadingUnassigned;

  return (
    <>
      <Tooltip title="Assign Reader">
        <IconButton color="primary" size="small" onClick={handleOpen}>
          <IconRadio size={20} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
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
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { p: 2, width: 520, maxWidth: '95vw' },
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Select Readers to Add
          </Typography>
          <AreaHierarchySelector
            buildings={buildings}
            floors={floors}
            floorplans={floorplans}
            maskedAreas={maskedAreas}
            devices={availableDevices}
            exclusive="device"
            multiple={true}
            value={selectedDeviceNodesToAdd}
            onChange={(nodes) => {
              setSelectedDeviceNodesToAdd(Array.isArray(nodes) ? nodes : [nodes]);
            }}
            onOpenChange={handleDropdownOpenChange}
            label="Search Area / Reader..."
          />

          {/* Bordered list for selected readers */}
          <Box
            sx={{
              mt: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              minHeight: 80,
              maxHeight: 160,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            {selectedDeviceNodesToAdd.filter((n) => n?.type === 'device' && n.data).length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 1.5, textAlign: 'center' }}
              >
                Selected Readers: None
              </Typography>
            ) : (
              selectedDeviceNodesToAdd
                .filter((n): n is { type: 'device'; data: any } => n?.type === 'device' && Boolean(n.data))
                .map((node) => {
                  const reader = node.data as UnassignedEngineReader;
                  const readerId =
                    reader.readerId || reader.floorplanDeviceId || (reader as any).id;
                  const position = [
                    reader.buildingName,
                    reader.floorName,
                    reader.floorplanName,
                    reader.areaName,
                  ]
                    .filter(Boolean)
                    .join(' > ');

                  return (
                    <Box
                      key={readerId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.5,
                        px: 1,
                        borderRadius: 0.5,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Box sx={{ pr: 1, overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          📟 {reader.readerName || reader.gmac}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          noWrap
                        >
                          {reader.gmac ? `MAC: ${reader.gmac} • ` : ''}
                          {position || 'No Position'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setSelectedDeviceNodesToAdd((prev) =>
                            prev.filter(
                              (n) =>
                                !(
                                  n?.type === 'device' &&
                                  (n.data?.readerId === readerId ||
                                    n.data?.floorplanDeviceId === readerId ||
                                    n.data?.id === readerId)
                                ),
                            ),
                          )
                        }
                      >
                        <IconX size={16} />
                      </IconButton>
                    </Box>
                  );
                })
            )}
          </Box>

          <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1} mt={2}>
            <Button size="small" onClick={handleCloseAddPopover} color="inherit">
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={selectedDeviceNodesToAdd.filter((n) => n?.type === 'device').length === 0}
              onClick={handleAddSelectedDevicesConfirm}
            >
              Add Selected ({selectedDeviceNodesToAdd.filter((n) => n?.type === 'device').length})
            </Button>
          </Box>
        </Popover>

        <DialogContent dividers>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          ) : assignedReaders.length === 0 ? (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
              No readers assigned to this engine.
            </Typography>
          ) : (
            <List disablePadding>
              {assignedReaders.map((reader) => {
                const position = [
                  reader.buildingName,
                  reader.floorName,
                  reader.floorplanName,
                  reader.areaName,
                ]
                  .filter(Boolean)
                  .join(' | ');

                return (
                  <ListItem
                    key={reader.readerId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 1.5,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight={600}>
                          {reader.readerName || reader.gmac}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.25 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            MAC: {reader.gmac || '-'}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="primary.main"
                            display="block"
                          >
                            {position ? `📍 ${position}` : 'No Position'}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveReader(reader.readerId)}
                    >
                      <IconX size={18} />
                    </IconButton>
                  </ListItem>
                );
              })}
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
