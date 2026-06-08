import * as React from 'react';
import {
  Box,
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

type Props = {
  buildings: BuildingType[];
  floors: floorType[];
  floorplans: FloorplanType[];
  value?: string; // selected floorplanId
  onChange: (fpId: string) => void;
};

const FloorplanSelect: React.FC<Props> = ({ buildings, floors, floorplans, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = React.useState<string[]>([]);

  // Build maps
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

  // Label of current value
  const currentLabel = React.useMemo(() => {
    const fp = floorplans.find((f) => f.id === value);
    return fp?.name ?? '';
  }, [value, floorplans]);

  return (
    <>
      {/* Anchor input */}
      <Box ref={anchorRef}>
        <TextField
          fullWidth
          placeholder="Select Floorplan"
          value={currentLabel || query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                <IconAdjustmentsHorizontal size={16} />
              </Box>
            ),
            readOnly: true, // don't allow free typing if you only want pick
          }}
        />
      </Box>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Paper
            elevation={8}
            sx={{
              p: 1,
              mt: 0.5,
              minWidth: 300,
              maxHeight: 400,
              overflow: 'auto',
              borderRadius: 2,
            }}
          >
            <SimpleTreeView
              expandedItems={expanded}
              onExpandedItemsChange={(_e, ids) =>
                setExpanded(Array.isArray(ids) ? ids : [ids])
              }
            >
              {buildings.map((b) => (
                <TreeItem key={b.id} itemId={b.id} label={`🏢 ${b.name}`}>
                  {(floorsByBuilding.get(b.id) ?? []).map((f) => (
                    <TreeItem key={f.id} itemId={f.id} label={`⬜ ${f.name}`}>
                      {(fpsByFloor.get(f.id) ?? []).map((fp) => (
                        <TreeItem
                          key={fp.id}
                          itemId={fp.id}
                          label={
                            <Typography
                              variant="body2"
                              sx={{
                                cursor: 'pointer',
                                fontWeight: fp.id === value ? 700 : 400,
                                color: fp.id === value ? 'primary.main' : 'inherit',
                              }}
                              onClick={() => {
                                onChange(fp.id); // emit
                                setOpen(false); // close dropdown
                              }}
                            >
                              🗺️ {fp.name}
                            </Typography>
                          }
                        />
                      ))}
                    </TreeItem>
                  ))}
                </TreeItem>
              ))}
            </SimpleTreeView>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
};

export default FloorplanSelect;
