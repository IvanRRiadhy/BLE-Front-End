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
};

// === Component ===
const AutocompleteFilter: React.FC<Props> = ({
  buildings,
  floors = [],
  floorplans = [],
  maskedAreas = [],
  initial,
  onChangeFilter,
  resetToken,
  hideSelectedAreas,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const anchorRef = React.useRef<HTMLDivElement | null>(null);

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

  // === State ===
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());
  // --- Track readiness ---
  const [dataReady, setDataReady] = React.useState(false);
  const initialApplied = React.useRef(false);

  // Detect when all data is ready

  const hasInitialData = React.useMemo(() => {
    if (!initial) return false;
    return (
      (initial.BuildingId?.length ?? 0) > 0 ||
      (initial.FloorId?.length ?? 0) > 0 ||
      (initial.FloorplanId?.length ?? 0) > 0 ||
      (initial.MaskedAreaId?.length ?? 0) > 0
    );
  }, [initial]);
  React.useEffect(() => {
    const ready =
      buildings.length > 0 &&
      (!hasFloors || floors.length > 0) &&
      (!hasFloorplans || floorplans.length > 0) &&
      (!hasMaskedAreas || maskedAreas.length > 0);

    if (ready) setDataReady(true);
  }, [buildings, floors, floorplans, maskedAreas, hasFloors, hasFloorplans, hasMaskedAreas]);

  // Apply initial once dataReady becomes true
  React.useEffect(() => {
    if (!dataReady || !hasInitialData || initialApplied.current || !initial) return;

    console.log('🟢 Applying initial filter now (final fix):', initial);

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

    onChangeFilter({
      BuildingId: initial.BuildingId ?? [],
      FloorId: initial.FloorId ?? [],
      FloorplanId: initial.FloorplanId ?? [],
      MaskedAreaId: initial.MaskedAreaId ?? [],
    });

    initialApplied.current = true;
    console.log('✅ Initial selection fully applied (after data + initial ready)');
  }, [dataReady, hasInitialData, initial, onChangeFilter]);

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

  // === Tree helpers ===
  const getChildren = React.useCallback(
    (key: string): string[] => {
      const { type, id } = parseKey(key);
      if (type === 'B')
        return hasFloors ? (floorsByBuilding.get(id) ?? []).map((f) => kF(f.id)) : [];
      if (type === 'F')
        return hasFloorplans ? (fpsByFloor.get(id) ?? []).map((fp) => kFP(fp.id)) : [];
      if (type === 'FP')
        return hasMaskedAreas ? (masByFp.get(id) ?? []).map((ma) => kMA(ma.id)) : [];
      return [];
    },
    [floorsByBuilding, fpsByFloor, masByFp, hasFloors, hasFloorplans, hasMaskedAreas],
  );

  const getParentKey = (key: string): string | null => {
    const { type, id } = parseKey(key);
    if (type === 'MA') {
      const ma = maskedAreas.find((m) => m.id === id);
      const fp = floorplans.find((f) => f.id === ma?.floorplanId);
      return fp ? kFP(fp.id) : null;
    }
    if (type === 'FP') {
      const fp = floorplans.find((f) => f.id === id);
      const fl = floors.find((f) => f.id === fp?.floorId);
      return fl ? kF(fl.id) : null;
    }
    if (type === 'F') {
      const fl = floors.find((f) => f.id === id);
      return fl ? kB(fl.buildingId) : null;
    }
    return null;
  };

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

    let parent = getParentKey(key);
    while (parent) {
      const children = getChildren(parent);
      const allChecked = children.length > 0 && children.every((c) => next.has(c));
      const someCheckedChildren = children.some((c) => next.has(c) || someChecked(c));
      if (allChecked) next.add(parent);
      else if (someCheckedChildren) next.delete(parent); // keep parent indeterminate
      else next.delete(parent);
      parent = getParentKey(parent);
    }
    setSelectedKeys(next);
  };

  const allChecked = (key: string) => selectedKeys.has(key);
  const someChecked = React.useCallback(
    (key: string): boolean => {
      if (selectedKeys.has(key)) return false;
      const children = getChildren(key);
      if (children.length === 0) return false;
      const anyChildChecked = children.some((c) => selectedKeys.has(c));
      const anyChildIndet = children.some((c) => someChecked(c));
      const allChildChecked = children.every((c) => selectedKeys.has(c));
      return (anyChildChecked && !allChildChecked) || anyChildIndet;
    },
    [getChildren, selectedKeys],
  );

  // === Build Filter State ===
  const toFilterState = React.useCallback((): FilterState => {
    const f: FilterState = { BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] };
    for (const key of selectedKeys) {
      const { type, id } = parseKey(key);
      if (type === 'B') f.BuildingId.push(id);
      else if (type === 'F') f.FloorId.push(id);
      else if (type === 'FP') f.FloorplanId.push(id);
      else if (type === 'MA') f.MaskedAreaId.push(id);
    }
    return f;
  }, [selectedKeys]);

  React.useEffect(() => {
    if (!disabled) onChangeFilter(toFilterState());
  }, [selectedKeys, disabled, toFilterState, onChangeFilter]);

  // === Selected Display ===
  const displayTree = React.useMemo<DisplayTree>(() => {
    if (!dataReady) return new Map();

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
  }, [dataReady, buildings, floors, floorplans, maskedAreas, selectedKeys, toFilterState]);

  const selectedTitle = hasMaskedAreas
    ? 'Selected Areas'
    : hasFloorplans
    ? 'Selected Floorplans'
    : hasFloors
    ? 'Selected Floors'
    : 'Selected Buildings';

  // === UI ===
  if (disabled) {
    return (
      <TextField
        fullWidth
        disabled
        value="No Building data available"
        InputProps={{
          startAdornment: (
            <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
              <IconAdjustmentsHorizontal size={16} />
            </Box>
          ),
        }}
      />
    );
  }

  // --- 🧠 Compute compressed display selection ---
// --- 🧠 Compute compressed display selection with icons ---
const computeDisplaySelection = React.useCallback(() => {
  const selected = new Set(selectedKeys);

  const isAllAreasSelectedForFp = (fpId: string) => {
    const mas = masByFp.get(fpId) ?? [];
    return mas.length > 0 && mas.every((ma) => selected.has(kMA(ma.id)));
  };

  const isAllFpSelectedForFloor = (floorId: string) => {
    const fps = fpsByFloor.get(floorId) ?? [];
    return fps.length > 0 && fps.every((fp) => selected.has(kFP(fp.id)) || isAllAreasSelectedForFp(fp.id));
  };

  const isAllFloorsSelectedForBuilding = (bId: string) => {
    const fls = floorsByBuilding.get(bId) ?? [];
    return fls.length > 0 && fls.every((fl) => selected.has(kF(fl.id)) || isAllFpSelectedForFloor(fl.id));
  };

  const displayNames: string[] = [];

  for (const b of buildings) {
    const bKey = kB(b.id);
    if (selected.has(bKey) || isAllFloorsSelectedForBuilding(b.id)) {
      displayNames.push(`🏢 ${b.name}`);
      continue;
    }

    const fls = floorsByBuilding.get(b.id) ?? [];
    for (const fl of fls) {
      const fKey = kF(fl.id);
      if (selected.has(fKey) || isAllFpSelectedForFloor(fl.id)) {
        displayNames.push(`⬜ ${fl.name}`);
        continue;
      }

      const fps = fpsByFloor.get(fl.id) ?? [];
      for (const fp of fps) {
        const fpKey = kFP(fp.id);
        if (selected.has(fpKey) || isAllAreasSelectedForFp(fp.id)) {
          displayNames.push(`🗺️ ${fp.name}`);
          continue;
        }

        const mas = masByFp.get(fp.id) ?? [];
        for (const ma of mas) {
          const maKey = kMA(ma.id);
          if (selected.has(maKey)) {
            displayNames.push(`📍 ${ma.name}`);
          }
        }
      }
    }
  }

  // Compact display: show max 3 names + ellipsis if more
  return displayNames.slice(0, 3).join(', ') + (displayNames.length > 3 ? '…' : '');
}, [selectedKeys, buildings, floorsByBuilding, fpsByFloor, masByFp]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box ref={anchorRef}>
        <TextField
          fullWidth
          placeholder="Building / Floor / Floorplan / Area"
          spellCheck={false}
          autoComplete="off"
          inputProps={{
            title: '', // remove browser tooltip
            readOnly: true, // prevent manual typing
          }}
          value={
            hideSelectedAreas ? (selectedKeys.size > 0 ? computeDisplaySelection() : '') : ''
          }
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          sx={{
            '& input': {
              cursor: 'pointer',
            },
          }}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                <IconAdjustmentsHorizontal size={16} />
              </Box>
            ),
          }}
        />
      </Box>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ zIndex: 2000 }}
      >
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Paper sx={{ p: 1, mt: 1, minWidth: 300, maxHeight: 420, overflowY: 'auto' }}>
            <SimpleTreeView
              expandedItems={expanded}
              onExpandedItemsChange={(_e, ids) => setExpanded(Array.isArray(ids) ? ids : [ids])}
            >
              {buildings.map((b) => {
                const bKey = kB(b.id);
                const floorsForB = hasFloors ? floorsByBuilding.get(b.id) ?? [] : [];
                return (
                  <TreeItem
                    key={bKey}
                    itemId={bKey}
                    label={
                      <Box
                        onClick={() => toggleNode(bKey)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Checkbox checked={allChecked(bKey)} indeterminate={someChecked(bKey)} />
                        <Typography title="">🏢 {b.name}</Typography>
                      </Box>
                    }
                  >
                    {hasFloors &&
                      floorsForB.map((f) => {
                        const fKey = kF(f.id);
                        const fps = hasFloorplans ? fpsByFloor.get(f.id) ?? [] : [];
                        return (
                          <TreeItem
                            key={fKey}
                            itemId={fKey}
                            label={
                              <Box
                                onClick={() => toggleNode(fKey)}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                              >
                                <Checkbox
                                  checked={allChecked(fKey)}
                                  indeterminate={someChecked(fKey)}
                                />
                                <Typography title="">⬜ {f.name}</Typography>
                              </Box>
                            }
                          >
                            {hasFloorplans &&
                              fps.map((fp) => {
                                const fpKey = kFP(fp.id);
                                const mas = hasMaskedAreas ? masByFp.get(fp.id) ?? [] : [];
                                return (
                                  <TreeItem
                                    key={fpKey}
                                    itemId={fpKey}
                                    label={
                                      <Box
                                        onClick={() => toggleNode(fpKey)}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                      >
                                        <Checkbox
                                          checked={allChecked(fpKey)}
                                          indeterminate={someChecked(fpKey)}
                                        />
                                        <Typography title="">🗺️ {fp.name}</Typography>
                                      </Box>
                                    }
                                  >
                                    {hasMaskedAreas &&
                                      mas.map((ma) => {
                                        const maKey = kMA(ma.id);
                                        return (
                                          <TreeItem
                                            key={maKey}
                                            itemId={maKey}
                                            label={
                                              <Box
                                                onClick={() => toggleNode(maKey)}
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 1,
                                                }}
                                              >
                                                <Checkbox checked={selectedKeys.has(maKey)} />
                                                <Typography title="">📍 {ma.name}</Typography>
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

      {/* === Selected Hierarchical Display === */}
      {!hideSelectedAreas && displayTree.size > 0 && (
        <Box
          sx={{
            mt: 1,
            maxHeight: 150,
            overflowY: 'auto',
            px: 1,
            mb: 5,
            borderRadius: 1,
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          <Typography variant="body1" fontWeight={700} mb={1}>
            {selectedTitle} :
          </Typography>
          {[...displayTree.entries()].map(([bId, bNode]) => (
            <Box key={bId} sx={{ mb: 0.75 }}>
              <Typography variant="body1" fontWeight={700}>
                {bNode.name}
              </Typography>
              {[...bNode.floors.entries()].map(([fId, fNode]) => (
                <Box key={fId} sx={{ pl: 2, mt: 0.25 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {fNode.name}
                  </Typography>
                  {[...fNode.floorplans.entries()].map(([fpId, fpNode]) => (
                    <Box key={fpId} sx={{ pl: 2, mt: 0.25 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {fpNode.name}
                      </Typography>
                      {fpNode.areas.length > 0 && (
                        <Box sx={{ pl: 2, mt: 0.25 }}>
                          {fpNode.areas.map((a) => (
                            <Typography variant="body2" key={a.id}>
                              {a.name}
                            </Typography>
                          ))}
                        </Box>
                      )}
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

export default AutocompleteFilter;
