import React, { forwardRef } from 'react';
import { Box, TextField, Paper, Popper, Typography, ClickAwayListener } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';

export type NodeType = 'building' | 'floor' | 'floorplan' | 'area';

export type SelectedNode =
  | { type: 'building'; data: any }
  | { type: 'floor'; data: any }
  | { type: 'floorplan'; data: any }
  | { type: 'area'; data: any }
  | null;

type Props = {
  buildings: any[];
  floors: any[];
  floorplans: any[];
  maskedAreas: any[];
  value: SelectedNode | SelectedNode[];
  onChange: (v: any) => void;
  error?: boolean;
  helperText?: string;
  exclusive?: NodeType;
  multiple?: boolean;
  highlightedAreaIds?: string[];
  disabled?: boolean;
  label?: string;
};

const AreaHierarchySelector: React.FC<Props> = forwardRef(
  (
    {
      buildings,
      floors,
      floorplans,
      maskedAreas,
      value,
      onChange,
      error = false,
      helperText = '',
      exclusive,
      multiple = false,
      highlightedAreaIds,
      disabled = false,
      label = 'Area',
    },
    ref,
  ) => {
    const anchorRef = React.useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = React.useState(false);
    const [clickAwayEnabled, setClickAwayEnabled] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const [expanded, setExpanded] = React.useState<string[]>([]);
    const selectedRef = React.useRef<HTMLDivElement | null>(null);

    const openPopper = () => {
      if (disabled) return;
      setOpen(true);
      setTimeout(() => setClickAwayEnabled(true), 500);
    };

    const canSelect = (type: NodeType) => {
      if (!exclusive) return true;
      return exclusive === type;
    };

    // Group data by hierarchy
    const floorsByBuilding = new Map<string, any[]>();
    floors.forEach((f) => {
      if (!floorsByBuilding.has(f.buildingId)) floorsByBuilding.set(f.buildingId, []);
      floorsByBuilding.get(f.buildingId)!.push(f);
    });

    const fpsByFloor = new Map<string, any[]>();
    floorplans.forEach((fp) => {
      if (!fpsByFloor.has(fp.floorId)) fpsByFloor.set(fp.floorId, []);
      fpsByFloor.get(fp.floorId)!.push(fp);
    });

    const maByFp = new Map<string, any[]>();
    maskedAreas.forEach((ma) => {
      if (!maByFp.has(ma.floorplanId)) maByFp.set(ma.floorplanId, []);
      maByFp.get(ma.floorplanId)!.push(ma);
    });

    const displayLabel = (() => {
      if (multiple && Array.isArray(value)) {
        if (value.length === 0) return '';
        if (value.length === 1) return value[0]?.data?.name ?? value[0]?.data?.areaName ?? '';
        return `${value.length} Items Selected`;
      }
      const singleValue = value as SelectedNode;
      return singleValue ? (singleValue.data?.name ?? singleValue.data?.areaName ?? '') : '';
    })();

    const isSelected = (type: NodeType, id: string) => {
      if (multiple && Array.isArray(value)) {
        return value.some((v) => v?.type === type && v?.data?.id === id);
      }
      const singleValue = value as SelectedNode;
      if (singleValue?.type === type && singleValue?.data?.id === id) return true;

      if (highlightedAreaIds && highlightedAreaIds.length > 0) {
        if (type === 'area') {
          return highlightedAreaIds.includes(id);
        } else if (type === 'floorplan') {
          const areas = maByFp.get(id) ?? [];
          return areas.length > 0 && areas.every((a) => highlightedAreaIds.includes(a.id));
        } else if (type === 'floor') {
          const fps = fpsByFloor.get(id) ?? [];
          const areas = fps.flatMap((fp) => maByFp.get(fp.id) ?? []);
          return areas.length > 0 && areas.every((a) => highlightedAreaIds.includes(a.id));
        } else if (type === 'building') {
          const fs = floorsByBuilding.get(id) ?? [];
          const fps = fs.flatMap((f) => fpsByFloor.get(f.id) ?? []);
          const areas = fps.flatMap((fp) => maByFp.get(fp.id) ?? []);
          return areas.length > 0 && areas.every((a) => highlightedAreaIds.includes(a.id));
        }
      }

      return false;
    };

    const handleSelect = (type: NodeType, data: any) => {
      if (!canSelect(type)) return;

      if (multiple && Array.isArray(value)) {
        const index = value.findIndex((v) => v?.type === type && v?.data?.id === data.id);
        if (index > -1) {
          const newValue = [...value];
          newValue.splice(index, 1);
          onChange(newValue);
        } else {
          onChange([...value, { type, data }]);
        }
      } else {
        onChange({ type, data });
        setOpen(false);
      }
    };

    // Auto-expand based on selected value
    React.useEffect(() => {
      if (!value) return;

      const expandKeys: string[] = [];
      const nodes = Array.isArray(value) ? value : ([value] as SelectedNode[]);

      nodes.forEach((node) => {
        if (!node) return;
        if (node.type === 'building') {
          expandKeys.push(`B-${node.data.id}`);
        }
        if (node.type === 'floor') {
          expandKeys.push(`B-${node.data.buildingId}`);
          expandKeys.push(`F-${node.data.id}`);
        }
        if (node.type === 'floorplan') {
          const fp = node.data;
          expandKeys.push(`B-${fp.buildingId}`);
          expandKeys.push(`F-${fp.floorId}`);
          expandKeys.push(`FP-${fp.id}`);
        }
        if (node.type === 'area') {
          const area = node.data;
          expandKeys.push(`B-${area.buildingId}`);
          expandKeys.push(`F-${area.floorId}`);
          expandKeys.push(`FP-${area.floorplanId}`);
          expandKeys.push(`MA-${area.id}`);
        }
      });

      setExpanded((prev) => Array.from(new Set([...prev, ...expandKeys])));
    }, [value]);

    // Auto-scroll to selected node
    React.useEffect(() => {
      if (open && selectedRef.current) {
        selectedRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, [open]);

    const keyword = search.trim().toLowerCase();

    const match = (name?: string) => name?.toLowerCase().includes(keyword);
    const filteredBuildings = buildings
      .map((b) => {
        const floorsOfBuilding = floorsByBuilding.get(b.id) ?? [];

        const matchedFloors = floorsOfBuilding
          .map((f) => {
            const fps = fpsByFloor.get(f.id) ?? [];

            const matchedFloorplans = fps
              .map((fp) => {
                const areas = maByFp.get(fp.id) ?? [];

                const matchedAreas = areas.filter((ma) => match(ma.name));

                // floorplan match OR any area match
                if (match(fp.name) || matchedAreas.length > 0) {
                  return {
                    ...fp,
                    areas: matchedAreas.length > 0 ? matchedAreas : areas,
                  };
                }

                return null;
              })
              .filter(Boolean);

            // floor match OR any floorplan match
            if (match(f.name) || matchedFloorplans.length > 0) {
              return {
                ...f,
                floorplans: matchedFloorplans.length > 0 ? matchedFloorplans : fps,
              };
            }

            return null;
          })
          .filter(Boolean);

        // building match OR any floor match
        if (match(b.name) || matchedFloors.length > 0) {
          return {
            ...b,
            floors: matchedFloors.length > 0 ? matchedFloors : floorsOfBuilding,
          };
        }

        return null;
      })
      .filter(Boolean);

    React.useEffect(() => {
      if (!search.trim()) return;

      const keyword = search.toLowerCase();
      const expandedKeys = new Set<string>();

      const match = (name?: string) => name?.toLowerCase().includes(keyword);

      // AREA → expand FP, Floor, Building
      maskedAreas.forEach((ma) => {
        if (match(ma.name)) {
          expandedKeys.add(`MA-${ma.id}`);
          expandedKeys.add(`FP-${ma.floorplanId}`);
          expandedKeys.add(`F-${ma.floorId}`);
          expandedKeys.add(`B-${ma.buildingId}`);
        }
      });

      // FLOORPLAN → expand Floor, Building
      floorplans.forEach((fp) => {
        if (match(fp.name)) {
          expandedKeys.add(`FP-${fp.id}`);
          expandedKeys.add(`F-${fp.floorId}`);
          expandedKeys.add(`B-${fp.buildingId}`);
        }
      });

      // FLOOR → expand Building
      floors.forEach((f) => {
        if (match(f.name)) {
          expandedKeys.add(`F-${f.id}`);
          expandedKeys.add(`B-${f.buildingId}`);
        }
      });

      // BUILDING → expand itself
      buildings.forEach((b) => {
        if (match(b.name)) {
          expandedKeys.add(`B-${b.id}`);
        }
      });

      setExpanded(Array.from(expandedKeys));
    }, [search, buildings, floors, floorplans, maskedAreas]);

    return (
      <Box sx={{ position: 'relative' }} ref={ref}>
        {/* FIELD BAR */}
        <Box ref={anchorRef}>
          <TextField
            fullWidth
            label={label}
            value={displayLabel}
            disabled={disabled}
            inputProps={{ readOnly: true }}
            onClick={openPopper}
            onFocus={openPopper}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                  <IconAdjustmentsHorizontal size={16} />
                </Box>
              ),
            }}
            error={error}
            helperText={helperText}
            sx={{
              '& input': { cursor: disabled ? 'default' : 'pointer' },
              marginBottom: helperText ? 0.5 : 0,
            }}
          />
        </Box>

        {/* DROPDOWN */}
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          sx={{ zIndex: 2000 }}
        >
          <ClickAwayListener
            onClickAway={() => {
              if (clickAwayEnabled) {
                setOpen(false);
                setClickAwayEnabled(false);
              }
            }}
          >
            <Paper sx={{ p: 1, mt: 1, minWidth: 320, maxHeight: 380 }}>
              {/* SEARCH */}
              <TextField
                size="small"
                placeholder="Search building, floor, floorplan, area..."
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1 }}
              />

              {/* TREE */}
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                <SimpleTreeView
                  expandedItems={expanded}
                  onExpandedItemsChange={(_e, ids) => setExpanded(Array.isArray(ids) ? ids : [ids])}
                >
                  {filteredBuildings.map((b: any) => (
                    <TreeItem
                      key={`B-${b.id}`}
                      itemId={`B-${b.id}`}
                      label={
                        <Typography
                          sx={{
                            cursor: 'pointer',
                            fontWeight: isSelected('building', b.id) ? 700 : 400,
                            color: isSelected('building', b.id) ? '#1976d2' : 'inherit',
                          }}
                          onClick={(e) => {
                            if (multiple) e.stopPropagation();
                            handleSelect('building', b);
                          }}
                        >
                          🏢 {b.name}
                        </Typography>
                      }
                    >
                      {(b.floors ?? []).map((f: any) => (
                        <TreeItem
                          key={`F-${f.id}`}
                          itemId={`F-${f.id}`}
                          label={
                            <Typography
                              sx={{
                                cursor: 'pointer',
                                fontWeight: isSelected('floor', f.id) ? 700 : 400,
                                color: isSelected('floor', f.id) ? '#1976d2' : 'inherit',
                              }}
                              onClick={(e) => {
                                if (multiple) e.stopPropagation();
                                handleSelect('floor', f);
                              }}
                            >
                              ⬜ {f.name}
                            </Typography>
                          }
                        >
                          {(f.floorplans ?? []).map((fp: any) => (
                            <TreeItem
                              key={`FP-${fp.id}`}
                              itemId={`FP-${fp.id}`}
                              label={
                                <Typography
                                  sx={{
                                    cursor: 'pointer',
                                    fontWeight: isSelected('floorplan', fp.id) ? 700 : 400,
                                    color: isSelected('floorplan', fp.id) ? '#1976d2' : 'inherit',
                                  }}
                                  onClick={(e) => {
                                    if (multiple) e.stopPropagation();
                                    handleSelect('floorplan', fp);
                                  }}
                                >
                                  🗺️ {fp.name}
                                </Typography>
                              }
                            >
                              {(fp.areas ?? []).map((ma: any) => (
                                <TreeItem
                                  key={`MA-${ma.id}`}
                                  itemId={`MA-${ma.id}`}
                                  label={
                                    <Typography
                                      sx={{
                                        cursor: 'pointer',
                                        fontWeight: isSelected('area', ma.id) ? 700 : 400,
                                        color: isSelected('area', ma.id) ? '#1976d2' : 'inherit',
                                      }}
                                      onClick={(e) => {
                                        if (multiple) e.stopPropagation();
                                        handleSelect('area', ma);
                                      }}
                                    >
                                      📍 {ma.name}
                                    </Typography>
                                  }
                                />
                              ))}
                            </TreeItem>
                          ))}
                        </TreeItem>
                      ))}
                    </TreeItem>
                  ))}
                </SimpleTreeView>
              </Box>
            </Paper>
          </ClickAwayListener>
        </Popper>
      </Box>
    );
  },
);

AreaHierarchySelector.displayName = 'AreaHierarchySelector';

export default AreaHierarchySelector;
