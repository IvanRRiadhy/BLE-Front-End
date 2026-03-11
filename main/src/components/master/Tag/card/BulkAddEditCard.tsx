import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Tooltip,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { IconPencil, IconPlus, IconTrash, IconLock, IconLockOpen } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CardType } from 'src/store/apps/crud/card';
import { defaultCardForm } from 'src/store/apps/defaultForm';
import { string } from 'prop-types';
import { useBulkAddCard, useEditCard } from 'src/hooks/useCard';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllCardAccess } from 'src/hooks/useCardAccess';
import { CardAccessType } from 'src/store/apps/crud/cardAccess';
import AreaHierarchySelector from 'src/components/shared/AreaHierarchySelector';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';

type Props = {
  type: 'add' | 'edit';
  initialData?: CardType[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const BulkAddEditCard = ({ type, initialData, setSelectedIds }: Props) => {
  const [openBulk, setOpenBulk] = useState(false);
  const [rows, setRows] = useState<CardType[]>([{ ...defaultCardForm }]);
  const [lockedCells, setLockedCells] = useState<
    Record<number, Partial<Record<keyof CardType, boolean>>>
  >({});
  const [lockedRows, setLockedRows] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const [columnDefaults, setColumnDefaults] = useState<Partial<CardType>>({});
  const [useDefault, setUseDefault] = useState<Record<keyof CardType, boolean>>({
    id: false,
    name: false,
    remarks: false,
    cardNumber: false,
    cardType: false,
    cardBarcode: false,
    dmac: false,
    isMultiMaskedArea: false,
    registeredMaskedAreaId: false,
    registeredMaskedArea: false,
    cardAccessIds: false,
    cardAccesses: false,
    isUsed: false,
    lastUsed: false,
    statusCard: false,
  });

  const BulkAddMutation = useBulkAddCard();
  const EditMutation = useEditCard();
  //   const { data: maskedArea = [] } = useAllMaskedAreas();
  //   const { data: cardAccess = [] } = useAllCardAccess();
  const buildings = useAllBuilding().data || [];
  const floors = useAllFloors().data || [];
  const floorplans = useAllFloorplans().data || [];
  const areas = useAllMaskedAreas().data || [];
  const cardAccess = useAllCardAccess().data || [];

  //   const maskedAreaOptions = useMemo(() => maskedArea, [maskedArea]);
  const cardAccessOptions = useMemo(() => cardAccess, [cardAccess]);

  // 1️⃣ Floorplans that actually have masked areas
  const floorplanIdsWithArea = useMemo(() => new Set(areas.map((ma) => ma.floorplanId)), [areas]);

  // 2️⃣ Floors that have at least one valid floorplan
  const floorIdsWithArea = useMemo(
    () =>
      new Set(floorplans.filter((fp) => floorplanIdsWithArea.has(fp.id)).map((fp) => fp.floorId)),
    [floorplans, floorplanIdsWithArea],
  );

  // 3️⃣ Buildings that have at least one valid floor
  const buildingIdsWithArea = useMemo(
    () => new Set(floors.filter((f) => floorIdsWithArea.has(f.id)).map((f) => f.buildingId)),
    [floors, floorIdsWithArea],
  );

  const filteredFloorplans = useMemo(
    () => floorplans.filter((fp) => floorplanIdsWithArea.has(fp.id)),
    [floorplans, floorplanIdsWithArea],
  );

  const filteredFloors = useMemo(
    () => floors.filter((f) => floorIdsWithArea.has(f.id)),
    [floors, floorIdsWithArea],
  );

  const filteredBuildings = useMemo(
    () => buildings.filter((b) => buildingIdsWithArea.has(b.id)),
    [buildings, buildingIdsWithArea],
  );

  const handleClickOpen = () => {
    if (type === 'edit' && initialData && initialData.length > 0) {
      setRows(initialData);
    } else {
      setRows([{ ...defaultCardForm }]);
    }
    setColumnDefaults({});
    setRowErrors({});
    setUseDefault({
      id: false,
      name: false,
      remarks: false,
      cardNumber: false,
      cardType: false,
      cardBarcode: false,
      dmac: false,
      isMultiMaskedArea: false,
      registeredMaskedAreaId: false,
      registeredMaskedArea: false,
      cardAccessIds: false,
      cardAccesses: false,
      isUsed: false,
      lastUsed: false,
      statusCard: false,
    });
    setOpenBulk(true);
  };
  const handleClose = () => {
    setOpenBulk(false);
  };

  const handleChange = (index: number, key: keyof CardType, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    setRowErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors[index]) delete newErrors[index][key];
      return newErrors;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        ...defaultCardForm,
        ...Object.fromEntries(
          Object.entries(columnDefaults).filter(([key]) => useDefault[key as keyof CardType]),
        ),
      },
    ]);
  };
  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const accessById = (id?: string) => cardAccessOptions.find((b) => b.id === id) ?? null;

  const areaById = (id?: string) => areas.find((a) => a.id === id) ?? null;

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const getAreaNode = (areaId?: string | null) => {
    const area = areaId ? areaMap.get(areaId) : null;
    if (!area) return null;

    return {
      type: 'area',
      data: area,
    } as const;
  };

  const getCellStyle = (rowIndex: number, key: keyof CardType) => {
    const isLocked = lockedRows[rowIndex] || lockedCells[rowIndex]?.[key];
    return {
      backgroundColor: isLocked ? '#e3f2fd' : 'transparent',
    };
  };

  // ───────────────────────────────
  // Validation
  // ───────────────────────────────

  const validateAllRows = (): boolean => {
    const errors: Record<number, Record<string, string>> = {};

    rows.forEach((row, rowIndex) => {
      const e: Record<string, string> = {};
      if (!row.name?.trim()) e.name = 'Name is required';
      if (!row.cardNumber?.trim()) e.cardNumber = 'Card Number is required';
    //   if (!row.cardType?.trim()) e.cardType = 'Card Type is required';
    //   if (!row.cardBarcode?.trim()) e.cardBarcode = 'Card Barcode is required';
      if (!row.dmac?.trim()) e.dmac = 'DMAC is required';
      if (Object.keys(e).length) errors[rowIndex] = e;
    });

    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(`Please fix ${Object.keys(errors).length} row(s) with errors`);
      return false;
    }
    return true;
  };

  // ───────────────────────────────
  // Submit Add
  // ───────────────────────────────
  const transformBulkPayload = (rows: CardType[]) => {
    return rows.map((r) => ({
      name: r.name,
      cardNumber: r.cardNumber,
      dmac: r.dmac,
      cardType: r.cardType || 'Ble',

    //   cardBarcode: r.cardBarcode || undefined,
      remarks: r.remarks || undefined,

      
      RegisteredMaskedAreaId: r.registeredMaskedAreaId || undefined,
      IsMultiMaskedArea: r.registeredMaskedArea ? false : true,

      cardAccessIds: r.cardAccessIds ?? [],
    }));
  };
  const handleSaveAdd = async () => {
    if (type !== 'add') return;
    if (!validateAllRows()) return;

    setIsSaving(true);

    try {
      const payload = transformBulkPayload(rows);

      const result = await BulkAddMutation.mutateAsync(payload);

    //   await Promise.allSettled(result);
        console.log("result", result)
      if (setSelectedIds) setSelectedIds(new Set());

      toast.success('Cards Added Successfully');
      handleClose();
    } catch (err) {
      console.log('Bulk Add error: ', err);
      toast.error('An error occurred during adding');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Bulk Edit Card">
          <IconButton color="default" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Bulk Add Card">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
            sx={{ mr: 2 }}
          >
            Bulk Add
          </Button>
        </Tooltip>
      )}

      <Dialog open={openBulk} onClose={handleClose} fullWidth maxWidth="xl">
        <DialogTitle>
          <Typography variant="h4" component="span" p={2} fontWeight={700}>
            {type === 'add' ? 'Bulk Add Card' : 'Bulk Edit Card'}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Table
            size="small"
            sx={{
              '& thead th': { borderBottom: '3px solid', borderColor: 'divider' },
              '& tbody td': { borderBottom: '2px solid', borderColor: 'divider' },
            }}
          >
            <TableHead>
              <TableRow>
                {/* NAME HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>Name</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.name}
                      onChange={(e) => setUseDefault({ ...useDefault, name: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, name: val }));
                        if (useDefault.name)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.name ? r : { ...r, name: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.name}
                    />
                  </div>
                </TableCell>
                {/* Info HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>Card Information</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.remarks}
                      onChange={(e) => setUseDefault({ ...useDefault, remarks: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.remarks || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, remarks: val }));
                        if (useDefault.remarks)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.remarks ? r : { ...r, remarks: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.remarks}
                    />
                  </div>
                </TableCell>
                {/* MAC HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>MAC</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.dmac}
                      onChange={(e) => setUseDefault({ ...useDefault, dmac: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.dmac || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, dmac: val }));
                        if (useDefault.dmac)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.dmac ? r : { ...r, dmac: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.dmac}
                    />
                  </div>
                </TableCell>
                {/* Card Number HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>Card Number</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.cardNumber}
                      onChange={(e) =>
                        setUseDefault({ ...useDefault, cardNumber: e.target.checked })
                      }
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.cardNumber || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, cardNumber: val }));
                        if (useDefault.cardNumber)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.cardNumber
                                ? r
                                : { ...r, cardNumber: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.cardNumber}
                    />
                  </div>
                </TableCell>

                {/* Card Access HEADER WITH DEFAULT */}
                <TableCell>
                  <Typography fontWeight={600}>Access</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.cardAccessIds}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDefault((prev) => ({ ...prev, cardAccessIds: checked }));
                        if (checked && columnDefaults.cardAccessIds?.length) {
                          const val = columnDefaults.cardAccessIds;
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.cardAccessIds
                                ? r
                                : { ...r, cardAccessIds: val },
                            ),
                          );
                        }
                      }}
                    />
                    <Autocomplete
                      multiple
                      size="small"
                      options={cardAccessOptions}
                      getOptionLabel={(b: CardAccessType) => b.name}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      value={cardAccessOptions.filter((o) =>
                        (columnDefaults.cardAccessIds ?? []).includes(o.id),
                      )}
                      onChange={(_, newVals) => {
                        const ids = newVals.map((v) => v.id);

                        setColumnDefaults((prev) => ({
                          ...prev,
                          cardAccessIds: ids,
                        }));

                        if (useDefault.cardAccessIds) {
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.cardAccessIds
                                ? r
                                : { ...r, cardAccessIds: ids },
                            ),
                          );
                        }
                      }}
                      disabled={!useDefault.cardAccessIds}
                      renderInput={(params) => <TextField {...params} placeholder="Access" />}
                      sx={{ minWidth: 220 }}
                    />
                  </div>
                </TableCell>
                {/* Area HEADER WITH DEFAULT */}
                <TableCell>
                  <Typography fontWeight={600}>Area</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.registeredMaskedAreaId}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDefault((prev) => ({ ...prev, registeredMaskedAreaId: checked }));
                        if (checked && columnDefaults.registeredMaskedAreaId?.length) {
                          const val = columnDefaults.registeredMaskedAreaId;
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.registeredMaskedAreaId
                                ? r
                                : { ...r, registeredMaskedAreaId: val },
                            ),
                          );
                        }
                      }}
                    />
                    <AreaHierarchySelector
                      buildings={filteredBuildings}
                      floors={filteredFloors}
                      floorplans={filteredFloorplans}
                      maskedAreas={areas}
                      exclusive="area"
                      value={getAreaNode(columnDefaults.registeredMaskedAreaId)}
                      onChange={(node) => {
                        if (!node || node.type !== 'area') return;

                        const areaId = node.data.id;

                        setColumnDefaults((prev) => ({
                          ...prev,
                          registeredMaskedAreaId: areaId,
                        }));

                        if (useDefault.registeredMaskedAreaId) {
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.registeredMaskedAreaId
                                ? r
                                : { ...r, registeredMaskedAreaId: areaId },
                            ),
                          );
                        }
                      }}
                    />
                  </div>
                </TableCell>

                {/* ADD ROW BUTTON */}
                <TableCell>
                  {type === 'add' && (
                    <Tooltip title="Add row">
                      <IconButton onClick={handleAddRow}>
                        <IconPlus size={20} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} sx={{ backgroundColor: lockedRows[idx] ? '#e3f2fd' : 'white' }}>
                  {/* NAME */}
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'name'),
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], name: !prev[idx]?.name },
                          }))
                        }
                      >
                        {lockedCells[idx]?.name ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                      <TextField
                        value={row.name}
                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.name}
                        helperText={rowErrors[idx]?.name}
                      />
                    </div>
                  </TableCell>
                  {/* Info */}
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'remarks'),
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], remarks: !prev[idx]?.remarks },
                          }))
                        }
                      >
                        {lockedCells[idx]?.remarks ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                      <TextField
                        value={row.remarks}
                        onChange={(e) => handleChange(idx, 'remarks', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.remarks}
                        helperText={rowErrors[idx]?.remarks}
                      />
                    </div>
                  </TableCell>
                  {/* DMAC */}
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'dmac'),
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], dmac: !prev[idx]?.dmac },
                          }))
                        }
                      >
                        {lockedCells[idx]?.dmac ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                      <TextField
                        value={row.dmac}
                        onChange={(e) => handleChange(idx, 'dmac', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.dmac}
                        helperText={rowErrors[idx]?.dmac}
                      />
                    </div>
                  </TableCell>
                  {/* Number */}
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'cardNumber'),
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], cardNumber: !prev[idx]?.cardNumber },
                          }))
                        }
                      >
                        {lockedCells[idx]?.cardNumber ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                      <TextField
                        value={row.cardNumber}
                        onChange={(e) => handleChange(idx, 'cardNumber', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.cardNumber}
                        helperText={rowErrors[idx]?.cardNumber}
                      />
                    </div>
                  </TableCell>

                  {/* Access */}
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'cardAccessIds'),
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], cardAccessIds: !prev[idx]?.cardAccessIds },
                          }))
                        }
                      >
                        {lockedCells[idx]?.cardAccessIds ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                      <Autocomplete
                        multiple
                        size="small"
                        options={cardAccessOptions}
                        getOptionLabel={(b: CardAccessType) => b.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={cardAccessOptions.filter((o) =>
                          (row.cardAccessIds ?? []).includes(o.id),
                        )}
                        onChange={(_, newVals) => {
                          const ids = newVals.map((v) => v.id);

                          setRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, cardAccessIds: ids } : r)),
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            error={!!rowErrors[idx]?.cardAccessIds}
                            helperText={rowErrors[idx]?.cardAccessIds}
                          />
                        )}
                        sx={{ minWidth: 200 }}
                      />
                    </div>
                  </TableCell>
                  {/* Area */}
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'registeredMaskedAreaId'),
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              registeredMaskedAreaId: !prev[idx]?.registeredMaskedAreaId,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.registeredMaskedAreaId ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                      <AreaHierarchySelector
                        buildings={filteredBuildings}
                        floors={filteredFloors}
                        floorplans={filteredFloorplans}
                        maskedAreas={areas}
                        exclusive="area"
                        value={getAreaNode(row.registeredMaskedAreaId)}
                        onChange={(node) => {
                          if (!node || node.type !== 'area') return;

                          const areaId = node.data.id;

                          setRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, registeredMaskedAreaId: areaId } : r,
                            ),
                          );
                        }}
                      />
                    </div>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tooltip title={lockedRows[idx] ? 'Unlock Row' : 'Lock Row'}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const isLocked = !lockedRows[idx];
                            setLockedRows((prev) => ({ ...prev, [idx]: isLocked }));
                            setLockedCells((prev) => ({
                              ...prev,
                              [idx]: isLocked
                                ? { brandId: true, name: true, ip: true, gmac: true }
                                : {},
                            }));
                          }}
                          sx={{ color: lockedRows[idx] ? '#1976d2' : 'inherit' }}
                        >
                          {lockedRows[idx] ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                        </IconButton>
                      </Tooltip>

                      {type === 'add' && (
                        <Tooltip title="Delete row">
                          <IconButton color="error" onClick={() => handleRemoveRow(idx)}>
                            <IconTrash size={20} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAdd}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Save All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkAddEditCard;
