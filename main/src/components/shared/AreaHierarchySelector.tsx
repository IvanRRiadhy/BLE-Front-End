import React, { forwardRef } from 'react';
import { Box, TextField, Paper, Popper, Typography, ClickAwayListener, Checkbox } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export type NodeType = 'building' | 'floor' | 'floorplan' | 'area' | 'device';

export type SelectedNode =
  | { type: 'building'; data: any }
  | { type: 'floor'; data: any }
  | { type: 'floorplan'; data: any }
  | { type: 'area'; data: any }
  | { type: 'device'; data: any }
  | null;

type Props = {
  buildings: any[];
  floors: any[];
  floorplans: any[];
  maskedAreas: any[];
  devices?: any[];
  value: SelectedNode | SelectedNode[];
  onChange: (v: any) => void;
  error?: boolean;
  helperText?: string;
  exclusive?: NodeType;
  multiple?: boolean;
  highlightedAreaIds?: string[];
  disabled?: boolean;
  label?: string;
  hideEmptyNodes?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const getDeviceId = (d: any) => String(d?.readerId ?? d?.id ?? d?.floorplanDeviceId ?? '');
const getDeviceName = (d: any) => d?.readerName ?? d?.name ?? d?.gmac ?? 'Device';
const getNodeId = (type: NodeType, data: any) => {
  if (!data) return '';
  if (type === 'device') {
    return getDeviceId(data);
  }
  return String(data.id ?? '');
};

const AreaHierarchySelector: React.FC<Props> = forwardRef(
  (
    {
      buildings,
      floors,
      floorplans,
      maskedAreas,
      devices = [],
      value,
      onChange,
      error = false,
      helperText = '',
      exclusive,
      multiple = false,
      highlightedAreaIds,
      disabled = false,
      label = 'Area',
      hideEmptyNodes = false,
      onOpenChange,
    },
    ref,
  ) => {
    const anchorRef = React.useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      onOpenChange?.(open);
    }, [open, onOpenChange]);

    const [search, setSearch] = React.useState('');

    const [expanded, setExpanded] = React.useState<string[]>([]);
    const selectedRef = React.useRef<HTMLDivElement | null>(null);

    const openPopper = () => {
      if (disabled) return;
      setOpen(true);
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

    const devicesByArea = new Map<string, any[]>();
    if (devices && devices.length > 0) {
      devices.forEach((d) => {
        const aId = d.areaId || d.floorplanMaskedAreaId || d.floorplanMaskedArea?.id;
        if (aId) {
          if (!devicesByArea.has(aId)) devicesByArea.set(aId, []);
          devicesByArea.get(aId)!.push(d);
        }
      });
    }

    const getDescendantDevices = (type: NodeType, data: any): any[] => {
      if (!data) return [];
      if (type === 'device') return [data];
      if (type === 'area') return devicesByArea.get(data.id) ?? [];
      if (type === 'floorplan') {
        const areas = maByFp.get(data.id) ?? [];
        return areas.flatMap((a) => devicesByArea.get(a.id) ?? []);
      }
      if (type === 'floor') {
        const fps = fpsByFloor.get(data.id) ?? [];
        const areas = fps.flatMap((fp) => maByFp.get(fp.id) ?? []);
        return areas.flatMap((a) => devicesByArea.get(a.id) ?? []);
      }
      if (type === 'building') {
        const fs = floorsByBuilding.get(data.id) ?? [];
        const fps = fs.flatMap((f) => fpsByFloor.get(f.id) ?? []);
        const areas = fps.flatMap((fp) => maByFp.get(fp.id) ?? []);
        return areas.flatMap((a) => devicesByArea.get(a.id) ?? []);
      }
      return [];
    };

    const displayLabel = (() => {
      if (multiple && Array.isArray(value)) {
        if (value.length === 0) return '';
        if (value.length === 1) {
          const first = value[0];
          return first?.data?.readerName ?? first?.data?.name ?? first?.data?.areaName ?? first?.data?.gmac ?? '';
        }
        return `${value.length} Items Selected`;
      }
      if (multiple && highlightedAreaIds && highlightedAreaIds.length > 0) {
        if (highlightedAreaIds.length === 1) {
          const area = maskedAreas.find((a) => a.id === highlightedAreaIds[0]);
          return area?.name ?? area?.areaName ?? '1 Item Selected';
        }
        return `${highlightedAreaIds.length} Items Selected`;
      }
      const singleValue = value as SelectedNode;
      return singleValue
        ? singleValue.data?.readerName ??
            singleValue.data?.name ??
            singleValue.data?.areaName ??
            singleValue.data?.gmac ??
            ''
        : '';
    })();

    const getDescendantAreaIds = (type: NodeType, id: string): string[] => {
      if (type === 'area') return [id];
      if (type === 'floorplan') {
        return (maByFp.get(id) ?? []).map((a) => a.id);
      }
      if (type === 'floor') {
        const fps = fpsByFloor.get(id) ?? [];
        return fps.flatMap((fp) => (maByFp.get(fp.id) ?? []).map((a) => a.id));
      }
      if (type === 'building') {
        const fs = floorsByBuilding.get(id) ?? [];
        const fps = fs.flatMap((f) => fpsByFloor.get(f.id) ?? []);
        return fps.flatMap((fp) => (maByFp.get(fp.id) ?? []).map((a) => a.id));
      }
      return [];
    };

    const isSelected = (type: NodeType, id: string, nodeData?: any) => {
      if (exclusive === 'device' && multiple && Array.isArray(value) && type !== 'device' && nodeData) {
        const descDevs = getDescendantDevices(type, nodeData);
        if (descDevs.length > 0) {
          return descDevs.every((d) => {
            const dId = getDeviceId(d);
            return dId && value.some((v) => v?.type === 'device' && getDeviceId(v?.data) === dId);
          });
        }
        return false;
      }

      if (multiple && Array.isArray(value)) {
        return value.some((v) => {
          if (v?.type !== type) return false;
          const vId = getNodeId(v.type, v.data);
          return Boolean(vId && id && vId === id);
        });
      }
      const singleValue = value as SelectedNode;
      if (singleValue?.type === type) {
        const sId = getNodeId(singleValue.type, singleValue.data);
        return Boolean(sId && id && sId === id);
      }

      if (highlightedAreaIds && highlightedAreaIds.length > 0) {
        if (type === 'area') {
          return highlightedAreaIds.includes(id);
        }
        const descendantIds = getDescendantAreaIds(type, id);
        return descendantIds.length > 0 && descendantIds.every((areaId) => highlightedAreaIds.includes(areaId));
      }

      return false;
    };

    const isIndeterminate = (type: NodeType, id: string, nodeData?: any): boolean => {
      if (type === 'device') return false;

      if (exclusive === 'device' && multiple && Array.isArray(value) && nodeData) {
        const descDevs = getDescendantDevices(type, nodeData);
        if (descDevs.length > 0) {
          const selectedCount = descDevs.filter((d) => {
            const dId = getDeviceId(d);
            return dId && value.some((v) => v?.type === 'device' && getDeviceId(v?.data) === dId);
          }).length;
          return selectedCount > 0 && selectedCount < descDevs.length;
        }
        return false;
      }

      if (isSelected(type, id, nodeData)) return false;

      if (highlightedAreaIds && highlightedAreaIds.length > 0) {
        const descendantIds = getDescendantAreaIds(type, id);
        if (descendantIds.length === 0) return false;
        const selectedCount = descendantIds.filter((areaId) =>
          highlightedAreaIds.includes(areaId),
        ).length;
        return selectedCount > 0 && selectedCount < descendantIds.length;
      }

      if (multiple && Array.isArray(value)) {
        const descendantIds = getDescendantAreaIds(type, id);
        if (descendantIds.length > 0) {
          const selectedCount = descendantIds.filter((areaId) =>
            value.some((v) => v?.type === 'area' && v?.data?.id === areaId),
          ).length;
          if (selectedCount > 0 && selectedCount < descendantIds.length) {
            return true;
          }
        }

        if (type === 'building') {
          const fs = floorsByBuilding.get(id) ?? [];
          return fs.some(
            (f) =>
              isSelected('floor', f.id, f) ||
              isIndeterminate('floor', f.id, f) ||
              (fpsByFloor.get(f.id) ?? []).some(
                (fp) => isSelected('floorplan', fp.id, fp) || isIndeterminate('floorplan', fp.id, fp),
              ),
          );
        }

        if (type === 'floor') {
          const fps = fpsByFloor.get(id) ?? [];
          return fps.some(
            (fp) => isSelected('floorplan', fp.id, fp) || isIndeterminate('floorplan', fp.id, fp),
          );
        }
      }

      return false;
    };

    const handleSelect = (type: NodeType, data: any) => {
      if (exclusive === 'device' && type !== 'device') {
        if (multiple && Array.isArray(value)) {
          const descDevs = getDescendantDevices(type, data);
          if (descDevs.length === 0) return;
          const allSelected = descDevs.every((d) => {
            const dId = getDeviceId(d);
            return dId && value.some((v) => v?.type === 'device' && getDeviceId(v?.data) === dId);
          });
          if (allSelected) {
            const descIds = new Set(descDevs.map((d) => getDeviceId(d)).filter(Boolean));
            const newValue = value.filter(
              (v) => !(v?.type === 'device' && descIds.has(getDeviceId(v?.data))),
            );
            onChange(newValue);
          } else {
            const existingIds = new Set(
              value.filter((v) => v?.type === 'device').map((v) => getDeviceId(v?.data)).filter(Boolean),
            );
            const toAdd = descDevs
              .filter((d) => {
                const dId = getDeviceId(d);
                return dId && !existingIds.has(dId);
              })
              .map((d) => ({ type: 'device' as const, data: d }));
            onChange([...value, ...toAdd]);
          }
        }
        return;
      }

      if (!canSelect(type)) return;

      if (multiple) {
        if (Array.isArray(value)) {
          const targetId = getNodeId(type, data);
          const index = value.findIndex(
            (v) => v?.type === type && getNodeId(v.type, v.data) === targetId,
          );
          if (index > -1) {
            const newValue = [...value];
            newValue.splice(index, 1);
            onChange(newValue);
          } else {
            onChange([...value, { type, data }]);
          }
        } else {
          onChange({ type, data });
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
        if (node.type === 'device') {
          const dev = node.data;
          const devId = getDeviceId(dev);
          const areaId = dev.areaId || dev.floorplanMaskedAreaId || dev.floorplanMaskedArea?.id;
          const area = maskedAreas.find((a) => a.id === areaId);
          if (area) {
            expandKeys.push(`B-${area.buildingId}`);
            expandKeys.push(`F-${area.floorId}`);
            expandKeys.push(`FP-${area.floorplanId}`);
            expandKeys.push(`MA-${area.id}`);
          }
          expandKeys.push(`D-${devId}`);
        }
      });

      setExpanded((prev) => Array.from(new Set([...prev, ...expandKeys])));
    }, [value, maskedAreas]);

    // Auto-scroll to selected node
    React.useEffect(() => {
      if (open && selectedRef.current) {
        selectedRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, [open]);

    const shouldFilterEmptyDevices = hideEmptyNodes || (exclusive === 'device' && devices !== undefined);

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

                const matchedAreas = areas
                  .map((ma) => {
                    const areaDevs = devicesByArea.get(ma.id) ?? [];

                    // If hiding empty nodes when devices mode is active:
                    if (shouldFilterEmptyDevices && areaDevs.length === 0) {
                      return null;
                    }

                    const matchedDevs = search.trim()
                      ? areaDevs.filter(
                          (d) =>
                            match(d.readerName) ||
                            match(d.name) ||
                            match(d.gmac) ||
                            match(d.ip),
                        )
                      : areaDevs;

                    if (shouldFilterEmptyDevices) {
                      if (matchedDevs.length > 0) {
                        return {
                          ...ma,
                          devices: matchedDevs,
                        };
                      }
                      return null;
                    }

                    if (match(ma.name) || matchedDevs.length > 0) {
                      return {
                        ...ma,
                        devices: matchedDevs.length > 0 ? matchedDevs : areaDevs,
                      };
                    }
                    return null;
                  })
                  .filter(Boolean);

                if (matchedAreas.length > 0) {
                  return {
                    ...fp,
                    areas: matchedAreas,
                  };
                }

                if (!shouldFilterEmptyDevices && match(fp.name)) {
                  return {
                    ...fp,
                    areas: areas.map((ma) => ({
                      ...ma,
                      devices: devicesByArea.get(ma.id) ?? [],
                    })),
                  };
                }

                return null;
              })
              .filter(Boolean);

            if (matchedFloorplans.length > 0) {
              return {
                ...f,
                floorplans: matchedFloorplans,
              };
            }

            if (!shouldFilterEmptyDevices && match(f.name)) {
              return {
                ...f,
                floorplans: fps,
              };
            }

            return null;
          })
          .filter(Boolean);

        if (matchedFloors.length > 0) {
          return {
            ...b,
            floors: matchedFloors,
          };
        }

        if (!shouldFilterEmptyDevices && match(b.name)) {
          return {
            ...b,
            floors: floorsOfBuilding,
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

      // DEVICE → expand Area, FP, Floor, Building
      if (devices && devices.length > 0) {
        devices.forEach((d) => {
          if (
            match(d.readerName) ||
            match(d.name) ||
            match(d.gmac) ||
            match(d.ip)
          ) {
            const devId = getDeviceId(d);
            const aId = d.areaId || d.floorplanMaskedAreaId || d.floorplanMaskedArea?.id;
            const ma = maskedAreas.find((a) => a.id === aId);
            expandedKeys.add(`D-${devId}`);
            if (ma) {
              expandedKeys.add(`MA-${ma.id}`);
              expandedKeys.add(`FP-${ma.floorplanId}`);
              expandedKeys.add(`F-${ma.floorId}`);
              expandedKeys.add(`B-${ma.buildingId}`);
            }
          }
        });
      }

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
    }, [search, buildings, floors, floorplans, maskedAreas, devices]);

    return (
      <ClickAwayListener
        onClickAway={() => {
          setOpen(false);
          setSearch('');
        }}
      >
        <Box sx={{ position: 'relative' }} ref={ref}>
          {/* FIELD BAR */}
          <Box ref={anchorRef}>
            <TextField
              fullWidth
              label={label}
              placeholder={
                open
                  ? displayLabel || 'Search building, floor, floorplan, area, device...'
                  : displayLabel
                  ? ''
                  : 'Search building, floor, floorplan, area, device...'
              }
              value={open ? search : search || displayLabel}
              disabled={disabled}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
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
                marginBottom: helperText ? 0.5 : 0,
              }}
            />
          </Box>

          {/* DROPDOWN */}
          <Popper
            open={open}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            style={{
              width: anchorRef.current ? Math.max(anchorRef.current.clientWidth, 480) : 480,
              maxWidth: '92vw',
            }}
            sx={{ zIndex: 2000 }}
          >
            <Paper sx={{ p: 1, mt: 1, width: '100%', maxHeight: 420, overflowY: 'auto' }} elevation={8}>
              {/* TREE */}
              <SimpleTreeView
                expandedItems={expanded}
                onExpandedItemsChange={(_e, ids) => setExpanded(Array.isArray(ids) ? ids : [ids])}
              >
                {filteredBuildings.map((b: any) => (
                  <TreeItem
                    key={`B-${b.id}`}
                    itemId={`B-${b.id}`}
                    label={
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
                        onClick={(e) => {
                          if (multiple) e.stopPropagation();
                          handleSelect('building', b);
                        }}
                      >
                        {multiple && (
                          <Checkbox
                            icon={icon}
                            checkedIcon={checkedIcon}
                            checked={isSelected('building', b.id, b)}
                            indeterminate={isIndeterminate('building', b.id, b)}
                            size="small"
                            style={{ padding: 0 }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            cursor: 'pointer',
                            fontWeight: isSelected('building', b.id, b) ? 700 : 400,
                            color: isSelected('building', b.id, b) ? 'primary.main' : 'inherit',
                          }}
                        >
                          🏢 {b.name}
                        </Typography>
                      </Box>
                    }
                  >
                    {(b.floors ?? []).map((f: any) => (
                      <TreeItem
                        key={`F-${f.id}`}
                        itemId={`F-${f.id}`}
                        label={
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
                            onClick={(e) => {
                              if (multiple) e.stopPropagation();
                              handleSelect('floor', f);
                            }}
                          >
                            {multiple && (
                              <Checkbox
                                icon={icon}
                                checkedIcon={checkedIcon}
                                checked={isSelected('floor', f.id, f)}
                                indeterminate={isIndeterminate('floor', f.id, f)}
                                size="small"
                                style={{ padding: 0 }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                cursor: 'pointer',
                                fontWeight: isSelected('floor', f.id, f) ? 700 : 400,
                                color: isSelected('floor', f.id, f) ? 'primary.main' : 'inherit',
                              }}
                            >
                              ⬜ {f.name}
                            </Typography>
                          </Box>
                        }
                      >
                        {(f.floorplans ?? []).map((fp: any) => (
                          <TreeItem
                            key={`FP-${fp.id}`}
                            itemId={`FP-${fp.id}`}
                            label={
                              <Box
                                sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
                                onClick={(e) => {
                                  if (multiple) e.stopPropagation();
                                  handleSelect('floorplan', fp);
                                }}
                              >
                                {multiple && (
                                  <Checkbox
                                    icon={icon}
                                    checkedIcon={checkedIcon}
                                    checked={isSelected('floorplan', fp.id, fp)}
                                    indeterminate={isIndeterminate('floorplan', fp.id, fp)}
                                    size="small"
                                    style={{ padding: 0 }}
                                  />
                                )}
                                <Typography
                                  variant="body2"
                                  sx={{
                                    cursor: 'pointer',
                                    fontWeight: isSelected('floorplan', fp.id, fp) ? 700 : 400,
                                    color: isSelected('floorplan', fp.id, fp) ? 'primary.main' : 'inherit',
                                  }}
                                >
                                  🗺️ {fp.name}
                                </Typography>
                              </Box>
                            }
                          >
                            {(fp.areas ?? []).map((ma: any) => {
                              const areaDevices = ma.devices ?? devicesByArea.get(ma.id) ?? [];
                              return (
                                <TreeItem
                                  key={`MA-${ma.id}`}
                                  itemId={`MA-${ma.id}`}
                                  label={
                                    <Box
                                      sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
                                      onClick={(e) => {
                                        if (multiple) e.stopPropagation();
                                        handleSelect('area', ma);
                                      }}
                                    >
                                      {multiple && (
                                        <Checkbox
                                          icon={icon}
                                          checkedIcon={checkedIcon}
                                          checked={isSelected('area', ma.id, ma)}
                                          indeterminate={isIndeterminate('area', ma.id, ma)}
                                          size="small"
                                          style={{ padding: 0 }}
                                        />
                                      )}
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          cursor: 'pointer',
                                          fontWeight: isSelected('area', ma.id, ma) ? 700 : 400,
                                          color: isSelected('area', ma.id, ma) ? 'primary.main' : 'inherit',
                                        }}
                                      >
                                        📍 {ma.name}
                                      </Typography>
                                    </Box>
                                  }
                                >
                                  {areaDevices.map((dev: any) => {
                                    const devId = getDeviceId(dev);
                                    const devName = getDeviceName(dev);
                                    return (
                                      <TreeItem
                                        key={`D-${devId}`}
                                        itemId={`D-${devId}`}
                                        label={
                                          <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
                                            onClick={(e) => {
                                              if (multiple) e.stopPropagation();
                                              handleSelect('device', dev);
                                            }}
                                          >
                                            {multiple && (
                                              <Checkbox
                                                icon={icon}
                                                checkedIcon={checkedIcon}
                                                checked={isSelected('device', devId, dev)}
                                                size="small"
                                                style={{ padding: 0 }}
                                              />
                                            )}
                                            <Typography
                                              variant="body2"
                                              sx={{
                                                cursor: 'pointer',
                                                fontWeight: isSelected('device', devId, dev) ? 700 : 400,
                                                color: isSelected('device', devId, dev) ? 'primary.main' : 'inherit',
                                              }}
                                            >
                                              📟 {devName} {dev.gmac ? `(${dev.gmac})` : ''}
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                    );
                                  })}
                                </TreeItem>
                              );
                            })}
                          </TreeItem>
                        ))}
                      </TreeItem>
                    ))}
                  </TreeItem>
                ))}
              </SimpleTreeView>
            </Paper>
          </Popper>
        </Box>
      </ClickAwayListener>
    );
  },
);

AreaHierarchySelector.displayName = 'AreaHierarchySelector';

export default AreaHierarchySelector;
