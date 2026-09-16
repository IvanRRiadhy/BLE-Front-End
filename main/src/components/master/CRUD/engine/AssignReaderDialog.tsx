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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { IconRadio, IconPlus, IconX, IconSearch } from '@tabler/icons-react';
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

  // Filter & Sort state for assignedReaders List
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedFloorplan, setSelectedFloorplan] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'mac' | 'area'>('default');

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

  // Dynamic filter dropdown options based on assignedReaders
  const buildingOptions = useMemo(() => {
    const set = new Set<string>();
    assignedReaders.forEach((r) => {
      if (r.buildingName) set.add(r.buildingName);
    });
    return Array.from(set).sort();
  }, [assignedReaders]);

  const floorOptions = useMemo(() => {
    const set = new Set<string>();
    assignedReaders.forEach((r) => {
      if (selectedBuilding !== 'all' && r.buildingName !== selectedBuilding) return;
      if (r.floorName) set.add(r.floorName);
    });
    return Array.from(set).sort();
  }, [assignedReaders, selectedBuilding]);

  const floorplanOptions = useMemo(() => {
    const set = new Set<string>();
    assignedReaders.forEach((r) => {
      if (selectedBuilding !== 'all' && r.buildingName !== selectedBuilding) return;
      if (selectedFloor !== 'all' && r.floorName !== selectedFloor) return;
      if (r.floorplanName) set.add(r.floorplanName);
    });
    return Array.from(set).sort();
  }, [assignedReaders, selectedBuilding, selectedFloor]);

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    assignedReaders.forEach((r) => {
      if (selectedBuilding !== 'all' && r.buildingName !== selectedBuilding) return;
      if (selectedFloor !== 'all' && r.floorName !== selectedFloor) return;
      if (selectedFloorplan !== 'all' && r.floorplanName !== selectedFloorplan) return;
      if (r.areaName) set.add(r.areaName);
    });
    return Array.from(set).sort();
  }, [assignedReaders, selectedBuilding, selectedFloor, selectedFloorplan]);

  // Processed assigned readers (filtered and sorted)
  const filteredAndSortedReaders = useMemo(() => {
    let result = [...assignedReaders];

    // Search filter: Name or MAC
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          (r.readerName && r.readerName.toLowerCase().includes(q)) ||
          (r.gmac && r.gmac.toLowerCase().includes(q)),
      );
    }

    // Location filters
    if (selectedBuilding !== 'all') {
      result = result.filter((r) => r.buildingName === selectedBuilding);
    }
    if (selectedFloor !== 'all') {
      result = result.filter((r) => r.floorName === selectedFloor);
    }
    if (selectedFloorplan !== 'all') {
      result = result.filter((r) => r.floorplanName === selectedFloorplan);
    }
    if (selectedArea !== 'all') {
      result = result.filter((r) => r.areaName === selectedArea);
    }

    // Sort
    if (sortBy === 'name') {
      result.sort((a, b) => {
        const nameA = (a.readerName || a.gmac || '').toLowerCase();
        const nameB = (b.readerName || b.gmac || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'mac') {
      result.sort((a, b) => {
        const macA = (a.gmac || '').toLowerCase();
        const macB = (b.gmac || '').toLowerCase();
        return macA.localeCompare(macB);
      });
    } else if (sortBy === 'area') {
      result.sort((a, b) => {
        const posA = [a.buildingName, a.floorName, a.floorplanName, a.areaName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const posB = [b.buildingName, b.floorName, b.floorplanName, b.areaName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return posA.localeCompare(posB);
      });
    }

    return result;
  }, [assignedReaders, searchQuery, selectedBuilding, selectedFloor, selectedFloorplan, selectedArea, sortBy]);

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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Filter, Sort & Search Toolbar */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {/* Search & Sort Row */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Search by Name or MAC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={18} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <IconX size={16} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{ flex: 1, minWidth: 200 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="sort-by-label">Sort By</InputLabel>
                    <Select
                      labelId="sort-by-label"
                      label="Sort By"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="mac">MAC</MenuItem>
                      <MenuItem value="area">Area (Location)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Location Filter Row */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                    <InputLabel id="building-filter-label">Building</InputLabel>
                    <Select
                      labelId="building-filter-label"
                      label="Building"
                      value={selectedBuilding}
                      onChange={(e) => {
                        setSelectedBuilding(e.target.value);
                        setSelectedFloor('all');
                        setSelectedFloorplan('all');
                        setSelectedArea('all');
                      }}
                    >
                      <MenuItem value="all">All Buildings</MenuItem>
                      {buildingOptions.map((b) => (
                        <MenuItem key={b} value={b}>
                          {b}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                    <InputLabel id="floor-filter-label">Floor</InputLabel>
                    <Select
                      labelId="floor-filter-label"
                      label="Floor"
                      value={selectedFloor}
                      onChange={(e) => {
                        setSelectedFloor(e.target.value);
                        setSelectedFloorplan('all');
                        setSelectedArea('all');
                      }}
                    >
                      <MenuItem value="all">All Floors</MenuItem>
                      {floorOptions.map((f) => (
                        <MenuItem key={f} value={f}>
                          {f}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                    <InputLabel id="floorplan-filter-label">Floorplan</InputLabel>
                    <Select
                      labelId="floorplan-filter-label"
                      label="Floorplan"
                      value={selectedFloorplan}
                      onChange={(e) => {
                        setSelectedFloorplan(e.target.value);
                        setSelectedArea('all');
                      }}
                    >
                      <MenuItem value="all">All Floorplans</MenuItem>
                      {floorplanOptions.map((fp) => (
                        <MenuItem key={fp} value={fp}>
                          {fp}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                    <InputLabel id="area-filter-label">Area</InputLabel>
                    <Select
                      labelId="area-filter-label"
                      label="Area"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      <MenuItem value="all">All Areas</MenuItem>
                      {areaOptions.map((a) => (
                        <MenuItem key={a} value={a}>
                          {a}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {(searchQuery ||
                    selectedBuilding !== 'all' ||
                    selectedFloor !== 'all' ||
                    selectedFloorplan !== 'all' ||
                    selectedArea !== 'all' ||
                    sortBy !== 'default') && (
                    <Button
                      size="small"
                      color="secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedBuilding('all');
                        setSelectedFloor('all');
                        setSelectedFloorplan('all');
                        setSelectedArea('all');
                        setSortBy('default');
                      }}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Reset
                    </Button>
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Showing {filteredAndSortedReaders.length} of {assignedReaders.length} assigned readers
                </Typography>
              </Box>

              {/* Reader List */}
              {filteredAndSortedReaders.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
                  No readers match the search or filter criteria.
                </Typography>
              ) : (
                <List disablePadding>
                  {filteredAndSortedReaders.map((reader) => {
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
            </Box>
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
