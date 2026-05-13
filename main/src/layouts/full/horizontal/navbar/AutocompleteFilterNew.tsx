import * as React from 'react';
import {
  Box,
  Checkbox,
  ClickAwayListener,
  Paper,
  Popper,
  TextField,
  Typography,
} from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';

import { BuildingType } from 'src/store/apps/crud/building';
import { floorType } from 'src/store/apps/crud/floor';
import { FloorplanType } from 'src/store/apps/crud/floorplan';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useState } from 'react';

// === Type definitions ===
type DisplayTree = Map<
  string,
  {
    name: string;
    floors: Map<
      string,
      {
        name: string;
        floorplans: Map<
          string,
          {
            name: string;
            areas: { id: string; name: string }[];
          }
        >;
      }
    >;
  }
>;

type FilterState = {
  BuildingId: string[];
  FloorId: string[];
  FloorplanId: string[];
  MaskedAreaId: string[];
};

const kB = (id: string) => `B:${id}`;
const kF = (id: string) => `F:${id}`;
const kFP = (id: string) => `FP:${id}`;
const kMA = (id: string) => `MA:${id}`;
const parseKey = (key: string) => {
  const i = key.indexOf(':');
  return { type: key.slice(0, i), id: key.slice(i + 1) };
};

type Props = {
  buildings: BuildingType[];
  floors?: floorType[];
  floorplans?: FloorplanType[];
  maskedAreas?: MaskedAreaType[];
  initial?: Partial<FilterState>;
  onChangeFilter: (f: FilterState) => void;
  resetToken?: number;
  hideSelectedAreas?: boolean;
  returnAll?: boolean;
};

// === Component ===
const AutocompleteFilterNew: React.FC<Props> = ({
  buildings,
  floors = [],
  floorplans = [],
  maskedAreas = [],
  initial,
  onChangeFilter,
  resetToken,
  hideSelectedAreas,
  returnAll = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [clickAwayEnabled, setClickAwayEnabled] = useState(false);
  const [query, setQuery] = React.useState('');
  const anchorRef = React.useRef<HTMLDivElement | null>(null);

  const openPopper = () => {
    setOpen(true);
    setTimeout(() => setClickAwayEnabled(true), 500); // enable after open
  };

  const hasFloors = floors.length > 0;
  const hasFloorplans = floorplans.length > 0;
  const hasMaskedAreas = maskedAreas.length > 0;
  const disabled = !buildings?.length;

  // === Build hierarchy maps ===
  const floorsByBuilding = React.useMemo(() => {
    const m = new Map<string, floorType[]>();
    for (const f of floors) {
      if (!m.has(f.buildingId)) m.set(f.buildingId, []);
      m.get(f.buildingId)!.push(f);
    }
    return m;
  }, [floors]);

  const fpsByFloor = React.useMemo(() => {
    const m = new Map<string, FloorplanType[]>();
    for (const fp of floorplans) {
      if (!m.has(fp.floorId)) m.set(fp.floorId, []);
      m.get(fp.floorId)!.push(fp);
    }
    return m;
  }, [floorplans]);

  const masByFp = React.useMemo(() => {
    const m = new Map<string, MaskedAreaType[]>();
    for (const ma of maskedAreas) {
      if (!m.has(ma.floorplanId)) m.set(ma.floorplanId, []);
      m.get(ma.floorplanId)!.push(ma);
    }
    return m;
  }, [maskedAreas]);

  const parentKeyMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const f of floors) m.set(kF(f.id), kB(f.buildingId));
    for (const fp of floorplans) m.set(kFP(fp.id), kF(fp.floorId));
    for (const ma of maskedAreas) m.set(kMA(ma.id), kFP(ma.floorplanId));
    return m;
  }, [floors, floorplans, maskedAreas]);

  // === State ===
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());
  // Simplified initialization: apply initial prop on mount or when it genuinely changes
  React.useEffect(() => {
    if (!initial) return;
    const isReal = (arr?: string[]) => (arr ?? []).filter((x) => x && x !== 'Empty').length > 0;
    const hasData = isReal(initial.BuildingId) || isReal(initial.FloorId) || isReal(initial.FloorplanId) || isReal(initial.MaskedAreaId);
    
    if (hasData) {
      console.log('AutocompleteFilterNew: Initializing with data:', initial);
      const pre = new Set<string>();
      (initial.BuildingId ?? []).forEach((id) => pre.add(kB(id)));
      (initial.FloorId ?? []).forEach((id) => pre.add(kF(id)));
      (initial.FloorplanId ?? []).forEach((id) => pre.add(kFP(id)));
      (initial.MaskedAreaId ?? []).forEach((id) => pre.add(kMA(id)));
      setSelectedKeys(pre);

      const expandedKeys: string[] = [];
      (initial.BuildingId ?? []).forEach((id) => expandedKeys.push(kB(id)));
      (initial.FloorId ?? []).forEach((id) => expandedKeys.push(kF(id)));
      (initial.FloorplanId ?? []).forEach((id) => expandedKeys.push(kFP(id)));
      setExpanded([...new Set(expandedKeys)]);
    }
  }, [initial]);

  // === Reset handler ===
  const prevReset = React.useRef<number>();
  React.useEffect(() => {
    if (resetToken === undefined || prevReset.current === resetToken) return;
    prevReset.current = resetToken;
    setSelectedKeys(new Set());
    setExpanded([]);
    onChangeFilter({ BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] });
    setQuery('');
  }, [resetToken, onChangeFilter]);

  // === Filtering logic ===
  const lowerQuery = query.toLowerCase();

  const getFilteredFloors = React.useCallback(
    (bId: string) => {
      const fls = floorsByBuilding.get(bId) ?? [];
      if (!lowerQuery) return fls;

      return fls.filter((f) => {
        if (f.name.toLowerCase().includes(lowerQuery)) return true;
        const fps = fpsByFloor.get(f.id) ?? [];
        return fps.some((fp) => {
          if (fp.name.toLowerCase().includes(lowerQuery)) return true;
          const mas = masByFp.get(fp.id) ?? [];
          return mas.some((ma) => ma.name.toLowerCase().includes(lowerQuery));
        });
      });
    },
    [floorsByBuilding, fpsByFloor, masByFp, lowerQuery],
  );

  const getFilteredFloorplans = React.useCallback(
    (fId: string) => {
      const fps = fpsByFloor.get(fId) ?? [];
      if (!lowerQuery) return fps;

      return fps.filter((fp) => {
        if (fp.name.toLowerCase().includes(lowerQuery)) return true;
        const mas = masByFp.get(fp.id) ?? [];
        return mas.some((ma) => ma.name.toLowerCase().includes(lowerQuery));
      });
    },
    [fpsByFloor, masByFp, lowerQuery],
  );

  const getFilteredAreas = React.useCallback(
    (fpId: string) => {
      const mas = masByFp.get(fpId) ?? [];
      if (!lowerQuery) return mas;
      return mas.filter((ma) => ma.name.toLowerCase().includes(lowerQuery));
    },
    [masByFp, lowerQuery],
  );

  const filteredBuildings = React.useMemo(() => {
    if (!lowerQuery) return buildings;

    return buildings.filter((b) => {
      if (b.name.toLowerCase().includes(lowerQuery)) return true;
      const fls = getFilteredFloors(b.id);
      return fls.length > 0;
    });
  }, [buildings, lowerQuery, getFilteredFloors]);

  // Auto-expand on search
  React.useEffect(() => {
    if (!lowerQuery) return;

    const newExpanded = new Set<string>();
    for (const b of buildings) {
      const fls = getFilteredFloors(b.id);
      if (fls.length > 0 || b.name.toLowerCase().includes(lowerQuery)) {
        if (fls.length > 0) newExpanded.add(kB(b.id));
        for (const f of fls) {
          const fps = getFilteredFloorplans(f.id);
          if (fps.length > 0 || f.name.toLowerCase().includes(lowerQuery)) {
            if (fps.length > 0) newExpanded.add(kF(f.id));
            for (const fp of fps) {
              const mas = getFilteredAreas(fp.id);
              if (mas.length > 0 || fp.name.toLowerCase().includes(lowerQuery)) {
                if (mas.length > 0) newExpanded.add(kFP(fp.id));
              }
            }
          }
        }
      }
    }
    setExpanded(Array.from(newExpanded));
  }, [lowerQuery, buildings, getFilteredFloors, getFilteredFloorplans, getFilteredAreas]);

  // === Tree helpers ===
  const getChildren = React.useCallback(
    (key: string): string[] => {
      const { type, id } = parseKey(key);
      if (type === 'B')
        return (floorsByBuilding.get(id) ?? []).map((f) => kF(f.id));
      if (type === 'F')
        return (fpsByFloor.get(id) ?? []).map((fp) => kFP(fp.id));
      if (type === 'FP')
        return (masByFp.get(id) ?? []).map((ma) => kMA(ma.id));
      return [];
    },
    [floorsByBuilding, fpsByFloor, masByFp],
  );

  const getParentKey = React.useCallback((key: string): string | null => {
    return parentKeyMap.get(key) ?? null;
  }, [parentKeyMap]);

  const getAllDescendants = React.useCallback(
    (key: string): string[] => {
      const res: string[] = [];
      const queue = [key];
      while (queue.length) {
        const cur = queue.shift()!;
        const children = getChildren(cur);
        res.push(...children);
        queue.push(...children);
      }
      return res;
    },
    [getChildren],
  );

  const toggleNode = (key: string) => {
    const next = new Set(selectedKeys);
    const allDesc = getAllDescendants(key);
    const includeSelf = [key, ...allDesc];
    const isSelecting = includeSelf.some((k) => !next.has(k));

    if (isSelecting) includeSelf.forEach((k) => next.add(k));
    else includeSelf.forEach((k) => next.delete(k));

    // Handle indeterminate state / auto-select parents
    let parent = getParentKey(key);
    while (parent) {
      const children = getChildren(parent);
      const allChecked = children.length > 0 && children.every((c) => next.has(c));
      if (allChecked) next.add(parent);
      else next.delete(parent);
      parent = getParentKey(parent);
    }
    setSelectedKeys(next);
    // Sync immediately on interaction
    const state = toFilterStateWithKeys(next);
    console.log('AutocompleteFilterNew: Interaction sync:', state);
    onChangeFilter(state);
  };

  const isSelected = React.useCallback(
    (key: string): boolean => {
      console.log('Checking selection for:', key);
      const res = selectedKeys.has(key);
      if (res) return true;
      const parent = getParentKey(key);
      if (parent) return isSelected(parent);
      return false;
    },
    [selectedKeys, getParentKey],
  );

  const isIndeterminate = React.useCallback(
    (key: string): boolean => {
      if (isSelected(key)) return false;
      const children = getChildren(key);
      if (children.length === 0) return false;
      return children.some((c) => isSelected(c) || isIndeterminate(c));
    },
    [isSelected, getChildren],
  );

  const toFilterStateWithKeys = (keys: Set<string>): FilterState => {
    const f: FilterState = { BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] };

    if (returnAll) {
      for (const key of keys) {
        const { type, id } = parseKey(key);
        if (type === 'B') f.BuildingId.push(id);
        else if (type === 'F') f.FloorId.push(id);
        else if (type === 'FP') f.FloorplanId.push(id);
        else if (type === 'MA') f.MaskedAreaId.push(id);
      }
      return f;
    }

    const isFullInternal = (key: string, currentKeys: Set<string>): boolean => {
      if (currentKeys.has(key)) return true;
      const children = getChildren(key);
      if (children.length === 0) return false;
      return children.every((c) => isFullInternal(c, currentKeys));
    };

    for (const b of buildings) {
      if (isFullInternal(kB(b.id), keys)) {
        f.BuildingId.push(b.id);
        continue;
      }
      const fls = floorsByBuilding.get(b.id) ?? [];
      for (const fl of fls) {
        if (isFullInternal(kF(fl.id), keys)) {
          f.FloorId.push(fl.id);
          continue;
        }
        const fps = fpsByFloor.get(fl.id) ?? [];
        for (const fp of fps) {
          if (isFullInternal(kFP(fp.id), keys)) {
            f.FloorplanId.push(fp.id);
            continue;
          }
          const mas = masByFp.get(fp.id) ?? [];
          for (const ma of mas) {
            if (keys.has(kMA(ma.id))) {
              f.MaskedAreaId.push(ma.id);
            }
          }
        }
      }
    }
    return f;
  };

  const toFilterState = React.useCallback((): FilterState => {
    return toFilterStateWithKeys(selectedKeys);
  }, [selectedKeys, returnAll, buildings, floorsByBuilding, fpsByFloor, masByFp, getChildren]);



  // === Selected Display ===
  const displayTree = React.useMemo<DisplayTree>(() => {
    console.log('AutocompleteFilterNew: Computing display tree...', {
      buildings: buildings.length,
      selectedKeys: selectedKeys.size,
    });
    const tree: DisplayTree = new Map();
    const buildingById = new Map(buildings.map((b) => [b.id, b]));
    const floorById = new Map(floors.map((f) => [f.id, f]));
    const floorplanById = new Map(floorplans.map((fp) => [fp.id, fp]));
    const maskedAreaById = new Map(maskedAreas.map((ma) => [ma.id, ma]));

    const ensure = (bId: string, fId?: string, fpId?: string) => {
      const b = buildingById.get(bId);
      if (!b) return {};
      if (!tree.has(bId)) tree.set(bId, { name: b.name, floors: new Map() });
      const bNode = tree.get(bId)!;
      if (!fId) return { bNode };

      const f = floorById.get(fId);
      if (!f) return { bNode };
      if (!bNode.floors.has(fId)) bNode.floors.set(fId, { name: f.name, floorplans: new Map() });
      const fNode = bNode.floors.get(fId)!;

      if (!fpId) return { bNode, fNode };
      const fp = floorplanById.get(fpId);
      if (!fp) return { bNode, fNode };
      if (!fNode.floorplans.has(fpId)) fNode.floorplans.set(fpId, { name: fp.name, areas: [] });
      const fpNode = fNode.floorplans.get(fpId)!;
      return { bNode, fNode, fpNode };
    };

    const fs = toFilterState();
    for (const maId of fs.MaskedAreaId) {
      const ma = maskedAreaById.get(maId);
      if (!ma) continue;
      const fp = floorplanById.get(ma.floorplanId);
      const f = floorById.get(fp?.floorId ?? '');
      const b = buildingById.get(f?.buildingId ?? '');
      if (b && f && fp) {
        const nodes = ensure(b.id, f.id, fp.id);
        if ((nodes as any).fpNode) (nodes as any).fpNode.areas.push({ id: ma.id, name: ma.name });
      }
    }
    for (const fpId of fs.FloorplanId) {
      const fp = floorplanById.get(fpId);
      const f = floorById.get(fp?.floorId ?? '');
      const b = buildingById.get(f?.buildingId ?? '');
      if (b && f && fp) ensure(b.id, f.id, fp.id);
    }
    for (const fId of fs.FloorId) {
      const f = floorById.get(fId);
      const b = buildingById.get(f?.buildingId ?? '');
      if (b && f) ensure(b.id, f.id);
    }
    for (const bId of fs.BuildingId) {
      const b = buildingById.get(bId);
      if (b) ensure(b.id);
    }
    return tree;
  }, [buildings, floors, floorplans, maskedAreas, toFilterState]);

  const selectedTitle = hasMaskedAreas
    ? 'Selected Areas'
    : hasFloorplans
    ? 'Selected Floorplans'
    : hasFloors
    ? 'Selected Floors'
    : 'Selected Buildings';

  // --- 🧠 Compute compressed display selection ---
  const computeDisplaySelection = React.useCallback(() => {
    const selected = new Set(selectedKeys);

    const isAllAreasSelectedForFp = (fpId: string) => {
      const mas = masByFp.get(fpId) ?? [];
      return mas.length > 0 && mas.every((ma) => selected.has(kMA(ma.id)));
    };

    const isAllFpSelectedForFloor = (floorId: string) => {
      const fps = fpsByFloor.get(floorId) ?? [];
      return (
        fps.length > 0 &&
        fps.every((fp) => selected.has(kFP(fp.id)) || isAllAreasSelectedForFp(fp.id))
      );
    };

    const isAllFloorsSelectedForBuilding = (bId: string) => {
      const fls = floorsByBuilding.get(bId) ?? [];
      return (
        fls.length > 0 &&
        fls.every((fl) => selected.has(kF(fl.id)) || isAllFpSelectedForFloor(fl.id))
      );
    };

    const displayNames: string[] = [];

    for (const b of buildings) {
      if (selected.has(kB(b.id)) || isAllFloorsSelectedForBuilding(b.id)) {
        displayNames.push(`🏢 ${b.name}`);
        continue;
      }
      const fls = floorsByBuilding.get(b.id) ?? [];
      for (const fl of fls) {
        if (selected.has(kF(fl.id)) || isAllFpSelectedForFloor(fl.id)) {
          displayNames.push(`⬜ ${fl.name}`);
          continue;
        }
        const fps = fpsByFloor.get(fl.id) ?? [];
        for (const fp of fps) {
          if (selected.has(kFP(fp.id)) || isAllAreasSelectedForFp(fp.id)) {
            displayNames.push(`🗺️ ${fp.name}`);
            continue;
          }
          const mas = masByFp.get(fp.id) ?? [];
          for (const ma of mas) {
            if (selected.has(kMA(ma.id))) {
              displayNames.push(`📍 ${ma.name}`);
            }
          }
        }
      }
    }
    return displayNames.slice(0, 3).join(', ') + (displayNames.length > 3 ? '…' : '');
  }, [selectedKeys, buildings, floorsByBuilding, fpsByFloor, masByFp]);

  // === UI ===
  if (disabled) {
    return (
      <TextField
        fullWidth
        disabled
        value="No Building data available"
        InputProps={{
          startAdornment: (
            <Box sx={{ pl: 1 }}>
              <IconAdjustmentsHorizontal size={16} />
            </Box>
          ),
        }}
      />
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box ref={anchorRef}>
        <TextField
          fullWidth
          placeholder="Search Building / Floor / Area"
          autoComplete="off"
          value={query || computeDisplaySelection()}
          onChange={(e) => setQuery(e.target.value)}
          onClick={openPopper}
          onFocus={openPopper}
          sx={{ '& input': { cursor: 'pointer' } }}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                <IconAdjustmentsHorizontal size={16} />
              </Box>
            ),
          }}
        />
      </Box>

      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 2000 }}>
        <ClickAwayListener
          onClickAway={() => {
            if (clickAwayEnabled) {
              setOpen(false);
              setClickAwayEnabled(false);
            }
          }}
        >
          <Paper sx={{ p: 1, mt: 1, minWidth: 320, maxHeight: 420, overflowY: 'auto' }}>
            <SimpleTreeView
              expandedItems={expanded}
              onExpandedItemsChange={(_e, ids) => setExpanded(Array.isArray(ids) ? ids : [ids])}
            >
              {filteredBuildings.map((b) => {
                const bKey = kB(b.id);
                const floorsForB = getFilteredFloors(b.id);
                return (
                  <TreeItem
                    key={bKey}
                    itemId={bKey}
                    label={
                      <Box onClick={() => toggleNode(bKey)} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox checked={isSelected(bKey)} indeterminate={isIndeterminate(bKey)} />
                        <Typography variant="body2">🏢 {b.name}</Typography>
                      </Box>
                    }
                  >
                    {floorsForB.map((f) => {
                      const fKey = kF(f.id);
                      const fps = getFilteredFloorplans(f.id);
                      return (
                        <TreeItem
                          key={fKey}
                          itemId={fKey}
                          label={
                            <Box onClick={() => toggleNode(fKey)} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Checkbox
                                checked={isSelected(fKey)}
                                indeterminate={isIndeterminate(fKey)}
                              />
                              <Typography variant="body2">⬜ {f.name}</Typography>
                            </Box>
                          }
                        >
                          {fps.map((fp) => {
                            const fpKey = kFP(fp.id);
                            const mas = getFilteredAreas(fp.id);
                            return (
                              <TreeItem
                                key={fpKey}
                                itemId={fpKey}
                                label={
                                  <Box onClick={() => toggleNode(fpKey)} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Checkbox
                                      checked={isSelected(fpKey)}
                                      indeterminate={isIndeterminate(fpKey)}
                                    />
                                    <Typography variant="body2">🗺️ {fp.name}</Typography>
                                  </Box>
                                }
                              >
                                {mas.map((ma) => {
                                  const maKey = kMA(ma.id);
                                  return (
                                    <TreeItem
                                      key={maKey}
                                      itemId={maKey}
                                      label={
                                        <Box onClick={() => toggleNode(maKey)} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Checkbox checked={isSelected(maKey)} />
                                          <Typography variant="body2">📍 {ma.name}</Typography>
                                        </Box>
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

      {!hideSelectedAreas && displayTree.size > 0 && (
        <Box sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', px: 1, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary" mb={1}>
            {selectedTitle}:
          </Typography>
          {[...displayTree.entries()].map(([bId, bNode]) => (
            <Box key={bId} sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={700}>{bNode.name}</Typography>
              {[...bNode.floors.entries()].map(([fId, fNode]) => (
                <Box key={fId} sx={{ pl: 2 }}>
                  <Typography variant="caption" fontWeight={600} display="block">{fNode.name}</Typography>
                  {[...fNode.floorplans.entries()].map(([fpId, fpNode]) => (
                    <Box key={fpId} sx={{ pl: 2 }}>
                      <Typography variant="caption" display="block">{fpNode.name}</Typography>
                      <Box sx={{ pl: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {fpNode.areas.map((a) => (
                          <Typography key={a.id} variant="caption" sx={{ opacity: 0.8 }}>
                            • {a.name}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AutocompleteFilterNew;
