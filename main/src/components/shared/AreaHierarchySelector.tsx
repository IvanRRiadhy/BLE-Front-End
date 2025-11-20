import React, { useState, useRef, useEffect } from 'react';
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
  value: SelectedNode;
  onChange: (v: SelectedNode) => void;
};

const AreaHierarchySelector: React.FC<Props> = ({
  buildings,
  floors,
  floorplans,
  maskedAreas,
  value,
  onChange,
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [clickAwayEnabled, setClickAwayEnabled] = useState(false);

  const [expanded, setExpanded] = useState<string[]>([]);
  const selectedRef = useRef<HTMLDivElement | null>(null);

  const openPopper = () => {
    setOpen(true);
    setTimeout(() => setClickAwayEnabled(true), 500); // enable after open
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

  const displayLabel = value ? value.data.name ?? value.data.areaName ?? '' : '';

  const handleSelect = (type: NodeType, data: any) => {
    onChange({ type, data });
    setOpen(false);
  };

  // Auto-expand based on selected value
  useEffect(() => {
    if (!value) return;

    const expandKeys: string[] = [];

    if (value.type === 'building') {
      expandKeys.push(`B-${value.data.id}`);
    }

    if (value.type === 'floor') {
      expandKeys.push(`B-${value.data.buildingId}`);
      expandKeys.push(`F-${value.data.id}`);
    }

    if (value.type === 'floorplan') {
      const fp = value.data;
      expandKeys.push(`B-${fp.buildingId}`);
      expandKeys.push(`F-${fp.floorId}`);
      expandKeys.push(`FP-${fp.id}`);
    }

    if (value.type === 'area') {
      const area = value.data;
      expandKeys.push(`B-${area.buildingId}`);
      expandKeys.push(`F-${area.floorId}`);
      expandKeys.push(`FP-${area.floorplanId}`);
      expandKeys.push(`MA-${area.id}`);
    }

    setExpanded(expandKeys);
  }, [value]);

  // Auto-scroll to selected node
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [open]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box ref={anchorRef}>
        <TextField
          fullWidth
          label="Area / Building / Floor"
          value={displayLabel}
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
          sx={{ '& input': { cursor: 'pointer' } }}
        />
      </Box>

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
          <Paper sx={{ p: 1, mt: 1, minWidth: 300, maxHeight: 350, overflowY: 'auto' }}>
            <SimpleTreeView
              expandedItems={expanded}
              onExpandedItemsChange={(_e, ids) => {
                const arr = Array.isArray(ids) ? ids : [ids];
                setExpanded(arr);
              }}
            >
              {buildings.map((b) => {
                const isSelected = value?.type === 'building' && value.data.id === b.id;

                return (
                  <TreeItem
                    key={`B-${b.id}`}
                    itemId={`B-${b.id}`}
                    label={
                      <div ref={isSelected ? selectedRef : null}>
                        <Typography
                          sx={{
                            cursor: 'pointer',
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? '#1976d2' : 'inherit',
                          }}
                          onClick={() => handleSelect('building', b)}
                        >
                          🏢 {b.name}
                        </Typography>
                      </div>
                    }
                  >
                    {(floorsByBuilding.get(b.id) ?? []).map((f) => {
                      const fSelected = value?.type === 'floor' && value.data.id === f.id;

                      return (
                        <TreeItem
                          key={`F-${f.id}`}
                          itemId={`F-${f.id}`}
                          label={
                            <div ref={fSelected ? selectedRef : null}>
                              <Typography
                                sx={{
                                  cursor: 'pointer',
                                  fontWeight: fSelected ? 700 : 400,
                                  color: fSelected ? '#1976d2' : 'inherit',
                                }}
                                onClick={() => handleSelect('floor', f)}
                              >
                                ⬜ {f.name}
                              </Typography>
                            </div>
                          }
                        >
                          {(fpsByFloor.get(f.id) ?? []).map((fp) => {
                            const fpSelected =
                              value?.type === 'floorplan' && value.data.id === fp.id;

                            return (
                              <TreeItem
                                key={`FP-${fp.id}`}
                                itemId={`FP-${fp.id}`}
                                label={
                                  <div ref={fpSelected ? selectedRef : null}>
                                    <Typography
                                      sx={{
                                        cursor: 'pointer',
                                        fontWeight: fpSelected ? 700 : 400,
                                        color: fpSelected ? '#1976d2' : 'inherit',
                                      }}
                                      onClick={() => handleSelect('floorplan', fp)}
                                    >
                                      🗺️ {fp.name}
                                    </Typography>
                                  </div>
                                }
                              >
                                {(maByFp.get(fp.id) ?? []).map((ma) => {
                                  const maSelected =
                                    value?.type === 'area' && value.data.id === ma.id;

                                  return (
                                    <TreeItem
                                      key={`MA-${ma.id}`}
                                      itemId={`MA-${ma.id}`}
                                      label={
                                        <div ref={maSelected ? selectedRef : null}>
                                          <Typography
                                            sx={{
                                              cursor: 'pointer',
                                              fontWeight: maSelected ? 700 : 400,
                                              color: maSelected ? '#1976d2' : 'inherit',
                                            }}
                                            onClick={() => handleSelect('area', ma)}
                                          >
                                            📍 {ma.name}
                                          </Typography>
                                        </div>
                                      }
                                    />
                                  );
                                })}
                              </TreeItem>
                            );
                          })}
                        </TreeItem>
                      );
                    })}
                  </TreeItem>
                );
              })}
            </SimpleTreeView>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};

export default AreaHierarchySelector;
