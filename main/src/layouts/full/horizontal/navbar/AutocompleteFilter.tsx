// AutocompleteFilter.tsx
import * as React from 'react';
import {
  Box,
  Checkbox,
  Chip,
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
  floors: floorType[];
  floorplans: FloorplanType[];
  maskedAreas: MaskedAreaType[];
  initial?: Partial<FilterState>;
  onChangeFilter: (f: FilterState) => void;
  resetToken?: number;
};

const AutocompleteFilter: React.FC<Props> = ({
  buildings,
  floors,
  floorplans,
  maskedAreas,
  initial,
  onChangeFilter,
  resetToken,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const anchorRef = React.useRef<HTMLDivElement | null>(null);

  // build child maps
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

  // expansion
  const [expanded, setExpanded] = React.useState<string[]>([]);

  // selection (B:/F:/FP:/MA:)
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(() => {
    const pre = new Set<string>();
    initial?.BuildingId?.forEach((id) => pre.add(kB(id)));
    initial?.FloorId?.forEach((id) => pre.add(kF(id)));
    initial?.FloorplanId?.forEach((id) => pre.add(kFP(id)));
    initial?.MaskedAreaId?.forEach((id) => pre.add(kMA(id)));
    return pre;
  });

  React.useEffect(() => {
    // Skip reset if token is undefined on first mount
    if (resetToken === undefined) return;

    const cleared: FilterState = { BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] };
    setSelectedKeys(new Set());
    lastEmittedRef.current = cleared;
    onChangeFilter(cleared);
    setQuery('');
  }, [resetToken]);


  // cascade helpers
  const getDescendants = React.useCallback(
    (nodeKey: string): string[] => {
      const { type, id } = parseKey(nodeKey);
      const keys: string[] = [nodeKey];
      if (type === 'B') {
        for (const f of floorsByBuilding.get(id) ?? []) keys.push(...getDescendants(kF(f.id)));
      } else if (type === 'F') {
        for (const fp of fpsByFloor.get(id) ?? []) keys.push(...getDescendants(kFP(fp.id)));
      } else if (type === 'FP') {
        for (const ma of masByFp.get(id) ?? []) keys.push(kMA(ma.id));
      }
      return keys;
    },
    [floorsByBuilding, fpsByFloor, masByFp],
  );

  const toggleNode = (nodeKey: string) => {
    const next = new Set(selectedKeys);
    const subtree = getDescendants(nodeKey);
    const anyUnchecked = subtree.some((k) => !next.has(k));
    if (anyUnchecked) subtree.forEach((k) => next.add(k));
    else subtree.forEach((k) => next.delete(k));
    setSelectedKeys(next);
  };

  const allChecked = (key: string) => getDescendants(key).every((k) => selectedKeys.has(k));
  const someChecked = (key: string) =>
    !allChecked(key) && getDescendants(key).some((k) => selectedKeys.has(k));

  // emit expanded FilterState
const toFilterState = React.useCallback((): FilterState => {
  const BuildingId: string[] = [];
  const FloorId: string[] = [];
  const FloorplanId: string[] = [];
  const MaskedAreaId: string[] = [];

  const addUnique = <T,>(arr: T[], v: T) => {
    if (!arr.includes(v)) arr.push(v);
  };

  for (const key of selectedKeys) {
    const { type, id } = parseKey(key);

    if (type === 'B') addUnique(BuildingId, id);
    else if (type === 'F') addUnique(FloorId, id);
    else if (type === 'FP') addUnique(FloorplanId, id);
    else if (type === 'MA') addUnique(MaskedAreaId, id);
  }

  // 🔹 Remove full downward cascade — only cascade UP to ensure parents exist
  for (const maId of MaskedAreaId) {
    const ma = maskedAreas.find((m) => m.id === maId);
    if (!ma) continue;

    const fpId = ma.floorplanId;
    if (fpId) addUnique(FloorplanId, fpId);

    const fp = floorplans.find((f) => f.id === fpId);
    const fId = ma.floorId || fp?.floorId;
    if (fId) addUnique(FloorId, fId);

    const fl = floors.find((fl) => fl.id === fId);
    if (fl?.buildingId) addUnique(BuildingId, fl.buildingId);
  }

  for (const fpId of FloorplanId) {
    const fp = floorplans.find((f) => f.id === fpId);
    if (!fp) continue;
    const f = floors.find((fl) => fl.id === fp.floorId);
    if (f) {
      addUnique(FloorId, f.id);
      if (f.buildingId) addUnique(BuildingId, f.buildingId);
    }
  }

  for (const fId of FloorId) {
    const fl = floors.find((fl) => fl.id === fId);
    if (fl?.buildingId) addUnique(BuildingId, fl.buildingId);
  }

  return { BuildingId, FloorId, FloorplanId, MaskedAreaId };
}, [selectedKeys, maskedAreas, floorplans, floors]);

  function equalFilter(a: FilterState, b: FilterState) {
    const eqArr = (x: string[], y: string[]) =>
      x.length === y.length && x.every((v, i) => v === y[i]);
    // assume arrays are already sorted; if not, sort copies:
    const A = {
      BuildingId: [...a.BuildingId].sort(),
      FloorId: [...a.FloorId].sort(),
      FloorplanId: [...a.FloorplanId].sort(),
      MaskedAreaId: [...a.MaskedAreaId].sort(),
    };
    const B = {
      BuildingId: [...b.BuildingId].sort(),
      FloorId: [...b.FloorId].sort(),
      FloorplanId: [...b.FloorplanId].sort(),
      MaskedAreaId: [...b.MaskedAreaId].sort(),
    };
    return (
      eqArr(A.BuildingId, B.BuildingId) &&
      eqArr(A.FloorId, B.FloorId) &&
      eqArr(A.FloorplanId, B.FloorplanId) &&
      eqArr(A.MaskedAreaId, B.MaskedAreaId)
    );
  }

  const lastEmittedRef = React.useRef<FilterState>({
    BuildingId: [],
    FloorId: [],
    FloorplanId: [],
    MaskedAreaId: [],
  });

  React.useEffect(() => {
    const next = toFilterState();
    if (!equalFilter(next, lastEmittedRef.current)) {
      lastEmittedRef.current = next;
      onChangeFilter(next);
    }
    console.log('Filter changed:', next);
  }, [selectedKeys, toFilterState]);

  React.useEffect(() => {
    console.log('Initial Filter: ', initial);
  }, [open]);
  // summary chips (string)
  const summary = React.useMemo(() => {
    const chips: string[] = [];
    for (const key of selectedKeys) {
      const { type, id } = parseKey(key);
      if (type === 'B') {
        const b = buildings.find((x) => x.id === id);
        if (b) chips.push(`🏢 ${b.name}`);
      } else if (type === 'F') {
        const f = floors.find((x) => x.id === id);
        if (f) chips.push(`⬜ ${f.name}`);
      } else if (type === 'FP') {
        const fp = floorplans.find((x) => x.id === id);
        if (fp) chips.push(`🗺️ ${fp.name}`);
      } else if (type === 'MA') {
        const ma = maskedAreas.find((x) => x.id === id);
        if (ma) chips.push(`📍 ${ma.name}`);
      }
    }
    return chips;
  }, [selectedKeys, buildings, floors, floorplans, maskedAreas]);

  // ----- Filtering the tree by query -----
  const q = query.trim().toLowerCase();
  const matches = {
    building: (b: BuildingType) => b.name.toLowerCase().includes(q),
    floor: (f: floorType) => f.name.toLowerCase().includes(q),
    fp: (fp: FloorplanType) => fp.name.toLowerCase().includes(q),
    ma: (ma: MaskedAreaType) => ma.name.toLowerCase().includes(q),
  };

  // Returns true if node matches or any descendant matches
  const shouldShow = React.useCallback(
    (key: string): boolean => {
      if (!q) return true;
      const { type, id } = parseKey(key);
      if (type === 'B') {
        const b = buildings.find((x) => x.id === id);
        if (b && matches.building(b)) return true;
        for (const f of floorsByBuilding.get(id) ?? []) if (shouldShow(kF(f.id))) return true;
        return false;
      } else if (type === 'F') {
        const f = floors.find((x) => x.id === id);
        if (f && matches.floor(f)) return true;
        for (const fp of fpsByFloor.get(id) ?? []) if (shouldShow(kFP(fp.id))) return true;
        return false;
      } else if (type === 'FP') {
        const fp = floorplans.find((x) => x.id === id);
        if (fp && matches.fp(fp)) return true;
        for (const ma of masByFp.get(id) ?? []) if (shouldShow(kMA(ma.id))) return true;
        return false;
      } else {
        const ma = maskedAreas.find((x) => x.id === id);
        return !!ma && matches.ma(ma);
      }
    },
    [q, buildings, floors, floorplans, maskedAreas, floorsByBuilding, fpsByFloor, masByFp],
  );

  // auto-expand when typing so matches are visible
  React.useEffect(() => {
    if (!q) return;
    const next: string[] = [];
    for (const b of buildings) {
      const bKey = kB(b.id);
      if (shouldShow(bKey)) next.push(bKey);
      for (const f of floorsByBuilding.get(b.id) ?? []) {
        const fKey = kF(f.id);
        if (shouldShow(fKey)) next.push(fKey);
        for (const fp of fpsByFloor.get(f.id) ?? []) {
          const fpKey = kFP(fp.id);
          if (shouldShow(fpKey)) next.push(fpKey);
        }
      }
    }
    setExpanded(Array.from(new Set(next)));
  }, [q, buildings, floorsByBuilding, fpsByFloor, shouldShow]);

  // label row
  const Row: React.FC<{
    label: string;
    checked: boolean;
    indeterminate?: boolean;
    onToggle: () => void;
  }> = ({ label, checked, indeterminate, onToggle }) => (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
    >
      <Checkbox
        size="small"
        checked={checked}
        indeterminate={!!indeterminate}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );

  // Reverse lookups
  const buildingById = React.useMemo(() => {
    const m = new Map(buildings.map((b) => [b.id, b]));
    return m;
  }, [buildings]);

  const floorById = React.useMemo(() => {
    const m = new Map(floors.map((f) => [f.id, f]));
    return m;
  }, [floors]);

  const floorplanById = React.useMemo(() => {
    const m = new Map(floorplans.map((fp) => [fp.id, fp]));
    return m;
  }, [floorplans]);

  const maskedAreaById = React.useMemo(() => {
    const m = new Map(maskedAreas.map((ma) => [ma.id, ma]));
    return m;
  }, [maskedAreas]);

  // Expanded/normalized current selection (children auto-filled if parent was selected)
  const currentFilter = React.useMemo(() => toFilterState(), [toFilterState, selectedKeys]);

  // Build a display hierarchy from the current selection, including ancestors for leaves
  type DisplayTree = Map<
    string, // buildingId
    {
      name: string;
      floors: Map<
        string, // floorId
        {
          name: string;
          floorplans: Map<
            string, // floorplanId
            {
              name: string;
              areas: { id: string; name: string }[];
            }
          >;
        }
      >;
    }
  >;

  const displayTree = React.useMemo<DisplayTree>(() => {
    const tree: DisplayTree = new Map();

    // Helper to ensure nodes exist
    const ensure = (bId: string, fId?: string, fpId?: string) => {
      const b = buildingById.get(bId);
      if (!b) return null;
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

    // 1) Add selected Areas (and their ancestors)
    for (const maId of currentFilter.MaskedAreaId) {
      const ma = maskedAreaById.get(maId);
      if (!ma) continue;
      const fp = floorplanById.get(ma.floorplanId);
      if (!fp) continue;
      const f = floorById.get(fp.floorId);
      if (!f) continue;
      const b = buildingById.get(f.buildingId);
      if (!b) continue;

      const nodes = ensure(b.id, f.id, fp.id);
      if (nodes?.fpNode) {
        // Avoid duplicates
        if (!nodes.fpNode.areas.some((a) => a.id === ma.id)) {
          nodes.fpNode.areas.push({ id: ma.id, name: ma.name });
        }
      }
    }

    // 2) Add selected Floorplans (even if no areas selected)
    for (const fpId of currentFilter.FloorplanId) {
      const fp = floorplanById.get(fpId);
      if (!fp) continue;
      const f = floorById.get(fp.floorId);
      if (!f) continue;
      const b = buildingById.get(f.buildingId);
      if (!b) continue;

      ensure(b.id, f.id, fp.id);
    }

    // 3) Add selected Floors
    for (const fId of currentFilter.FloorId) {
      const f = floorById.get(fId);
      if (!f) continue;
      const b = buildingById.get(f.buildingId);
      if (!b) continue;

      ensure(b.id, f.id);
    }

    // 4) Add selected Buildings
    for (const bId of currentFilter.BuildingId) {
      const b = buildingById.get(bId);
      if (!b) continue;

      ensure(b.id);
    }

    return tree;
  }, [currentFilter, buildingById, floorById, floorplanById, maskedAreaById]);

  React.useEffect(() => {
  if (!initial) return;

  // Wait until all data are loaded before applying
  const allLoaded =
    buildings.length > 0 && floors.length > 0 && floorplans.length > 0 && maskedAreas.length > 0;
  if (!allLoaded) return;

  const pre = new Set<string>();
  initial.BuildingId?.forEach((id) => pre.add(kB(id)));
  initial.FloorId?.forEach((id) => pre.add(kF(id)));
  initial.FloorplanId?.forEach((id) => pre.add(kFP(id)));
  initial.MaskedAreaId?.forEach((id) => pre.add(kMA(id)));

  setSelectedKeys(pre);
  lastEmittedRef.current = toFilterState();
  console.log('✅ Initial filter applied:', initial);
}, [initial, buildings, floors, floorplans, maskedAreas]);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Anchor & Input */}
      <Box ref={anchorRef}>
        <TextField
          fullWidth
          placeholder="Building / Floor / Floorplan / Area"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                <IconAdjustmentsHorizontal size={16} />
              </Box>
            ),
          }}
        />
      </Box>

      {/* Dropdown Popper — positioned ABOVE the Selected Areas */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        modifiers={[
          {
            name: 'offset',
            options: { offset: [0, -8] }, // 🔼 overlaps content below
          },
          {
            name: 'preventOverflow',
            options: { boundary: 'viewport' },
          },
          {
            name: 'flip',
            enabled: false, // keep it below the input
          },
        ]}
        sx={{
          zIndex: 2000, // 🧱 ensure it's above everything else
          pointerEvents: 'auto',
        }}
      >
        <ClickAwayListener
          onClickAway={(event) => {
            if (anchorRef.current && anchorRef.current.contains(event.target as Node)) return;
            setOpen(false);
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 1,
              mt: -1, // 👈 this helps overlap the “Selected Areas” block
              minWidth: 360,
              maxWidth: 520,
              maxHeight: 420,
              overflow: 'auto',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 8,
            }}
            onMouseDown={(e) => e.preventDefault()} // keep focus on input
          >
            <SimpleTreeView
              expandedItems={expanded}
              onExpandedItemsChange={(_e, ids) => setExpanded(Array.isArray(ids) ? ids : [ids])}
            >
              {buildings.map((b) => {
                const bKey = kB(b.id);
                if (!shouldShow(bKey)) return null;

                const bFloors = floorsByBuilding.get(b.id) ?? [];
                const bChecked = allChecked(bKey);
                const bIndet = someChecked(bKey);
                return (
                  <TreeItem
                    key={bKey}
                    itemId={bKey}
                    label={
                      <Row
                        label={`🏢 ${b.name}`}
                        checked={bChecked}
                        indeterminate={bIndet}
                        onToggle={() => toggleNode(bKey)}
                      />
                    }
                  >
                    {bFloors.map((f) => {
                      const fKey = kF(f.id);
                      if (!shouldShow(fKey)) return null;

                      const fps = fpsByFloor.get(f.id) ?? [];
                      const fChecked = allChecked(fKey);
                      const fIndet = someChecked(fKey);
                      return (
                        <TreeItem
                          key={fKey}
                          itemId={fKey}
                          label={
                            <Row
                              label={`⬜ ${f.name}`}
                              checked={fChecked}
                              indeterminate={fIndet}
                              onToggle={() => toggleNode(fKey)}
                            />
                          }
                        >
                          {fps.map((fp) => {
                            const fpKey = kFP(fp.id);
                            if (!shouldShow(fpKey)) return null;

                            const mas = masByFp.get(fp.id) ?? [];
                            const fpChecked = allChecked(fpKey);
                            const fpIndet = someChecked(fpKey);
                            return (
                              <TreeItem
                                key={fpKey}
                                itemId={fpKey}
                                label={
                                  <Row
                                    label={`🗺️ ${fp.name}`}
                                    checked={fpChecked}
                                    indeterminate={fpIndet}
                                    onToggle={() => toggleNode(fpKey)}
                                  />
                                }
                              >
                                {mas.map((ma) => {
                                  const maKey = kMA(ma.id);
                                  if (!shouldShow(maKey)) return null;

                                  const maChecked = selectedKeys.has(maKey);
                                  return (
                                    <TreeItem
                                      key={maKey}
                                      itemId={maKey}
                                      label={
                                        <Row
                                          label={`📍 ${ma.name}`}
                                          checked={maChecked}
                                          onToggle={() => toggleNode(maKey)}
                                        />
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

      {/* Selected Areas (under Popper, will be overlapped visually) */}
      {displayTree.size > 0 && (
  <Box
    sx={{
      mt: 1,
      position: 'relative',
      zIndex: 1, // ensure Popper appears above
      maxHeight: 150, // 👈 you can adjust this to your liking (e.g., 120–160px)
      overflowY: 'auto', // 👈 make it scrollable
      px: 1, // add a bit of padding for scrollbar space
      mb: 5,
      borderRadius: 1,
      // border: '1px solid',
      // borderColor: 'divider',
      backgroundColor: (theme) => theme.palette.background.paper,
    }}
  >
          <Typography variant="body1" fontWeight={700} mb={1}>
            Selected Areas :
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
