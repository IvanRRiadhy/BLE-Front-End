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
import {
  IconPencil,
  IconPlus,
  IconTrash,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { bleReaderType, useAddReader, useEditReader } from 'src/hooks/useReader';
import { useAllBrands } from 'src/hooks/useBrand';
import { defaultBleReaderForm } from 'src/store/apps/defaultForm';
import { useQueryClient } from '@tanstack/react-query';
import type { BrandType } from 'src/store/apps/crud/brand';

type Props = {
  type: 'add' | 'edit';
  initialData?: bleReaderType[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const BulkAddEditBleReader = ({ type, initialData, setSelectedIds }: Props) => {
  const [openBulk, setOpenBulk] = useState(false);
  const [rows, setRows] = useState<bleReaderType[]>([{ ...defaultBleReaderForm }]);
  const [lockedCells, setLockedCells] = useState<
    Record<number, Partial<Record<keyof bleReaderType, boolean>>>
  >({});
  const [lockedRows, setLockedRows] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const [columnDefaults, setColumnDefaults] = useState<Partial<bleReaderType>>({});
  const [useDefault, setUseDefault] = useState<Record<keyof bleReaderType, boolean>>({
    brandId: false,
    name: false,
    ip: false,
    gmac: false,
    id: false,
    createdBy: false,
    createdAt: false,
    updatedBy: false,
    updatedAt: false,
  });

  const queryClient = useQueryClient();
  const addMutation = useAddReader();
  const editMutation = useEditReader();
  const { data: brands = [] } = useAllBrands?.() || { data: [] };

  const brandOptions = useMemo(() => brands, [brands]);

  // ───────────────────────────────
  // Dialog controls
  // ───────────────────────────────
  const handleClickOpen = () => {
    if (type === 'edit' && initialData && initialData.length > 0) {
      setRows(initialData);
    } else {
      setRows([{ ...defaultBleReaderForm }]);
    }
    setColumnDefaults({});
    setRowErrors({});
    setUseDefault({
      brandId: false,
      name: false,
      ip: false,
      gmac: false,
      id: false,
      createdBy: false,
      createdAt: false,
      updatedBy: false,
      updatedAt: false,
    });
    setOpenBulk(true);
  };
  const handleClose = () => setOpenBulk(false);

  // ───────────────────────────────
  // Input / Lock handlers
  // ───────────────────────────────
  const handleChange = (index: number, key: keyof bleReaderType, value: string) => {
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
        ...defaultBleReaderForm,
        ...Object.fromEntries(
          Object.entries(columnDefaults).filter(([key]) => useDefault[key as keyof bleReaderType]),
        ),
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const brandById = (id?: string) => brandOptions.find((b) => b.id === id) ?? null;

  const getCellStyle = (rowIndex: number, key: keyof bleReaderType) => {
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
    rows.forEach((r, idx) => {
      const e: Record<string, string> = {};
      if (!r.brandId) e.brandId = 'Brand is required';
      if (!r.name?.trim()) e.name = 'Name is required';
      if (!r.ip?.trim()) e.ip = 'IP is required';
      if (!r.gmac?.trim()) e.gmac = 'GMAC is required';
      if (Object.keys(e).length) errors[idx] = e;
    });
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(`Please fix ${Object.keys(errors).length} row(s) with errors`);
      return false;
    }
    return true;
  };

  // ───────────────────────────────
  // Save All
  // ───────────────────────────────
  const handleSaveAll = async () => {
    if (!validateAllRows()) return;
    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = rows.map(async (row) => {
        try {
          if (row.id) await editMutation.mutateAsync(row);
          else await addMutation.mutateAsync(row);
          successCount++;
        } catch {
          failCount++;
        }
      });

      await Promise.allSettled(promises);

      // Refresh cache
      await queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      if (setSelectedIds) setSelectedIds(new Set());

      if (failCount === 0)
        toast.success(`${successCount} reader(s) ${type === 'add' ? 'added' : 'updated'} successfully`);
      else {
        if (successCount > 0)
          toast.success(`${successCount} reader(s) saved, ${failCount} failed`);
        toast.error(`${failCount} reader(s) failed to save`);
      }

      handleClose();
    } catch (err) {
      console.error('Bulk save failed:', err);
      toast.error('An error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  // ───────────────────────────────
  // UI (unchanged)
  // ───────────────────────────────
  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Bulk Edit BLE Reader">
          <IconButton color="default" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Bulk Add BLE Reader">
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

      <Dialog open={openBulk} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle>
          <Typography variant="h4" component="span" p={2} fontWeight={700}>
            Bulk Add/Edit BLE Reader
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
                {/* BRAND HEADER WITH DEFAULT */}
                <TableCell>
                  <Typography fontWeight={600}>Brand</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.brandId}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDefault((prev) => ({ ...prev, brandId: checked }));
                        if (checked && columnDefaults.brandId) {
                          const val = columnDefaults.brandId;
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.brandId ? r : { ...r, brandId: val },
                            ),
                          );
                        }
                      }}
                    />
                    <Autocomplete
                      size="small"
                      options={brandOptions}
                      getOptionLabel={(b: BrandType) => b.name}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      value={brandById(columnDefaults.brandId)}
                      onChange={(_, newVal) => {
                        const val = newVal?.id ?? '';
                        setColumnDefaults((prev) => ({ ...prev, brandId: val }));
                        if (useDefault.brandId) {
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.brandId ? r : { ...r, brandId: val },
                            ),
                          );
                        }
                      }}
                      disabled={!useDefault.brandId}
                      renderInput={(params) => <TextField {...params} placeholder="Brand" />}
                      sx={{ minWidth: 200 }}
                    />
                  </div>
                </TableCell>

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

                {/* IP HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>IP</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.ip}
                      onChange={(e) => setUseDefault({ ...useDefault, ip: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.ip || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, ip: val }));
                        if (useDefault.ip)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.ip ? r : { ...r, ip: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.ip}
                    />
                  </div>
                </TableCell>

                {/* GMAC HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>GMAC</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.gmac}
                      onChange={(e) => setUseDefault({ ...useDefault, gmac: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.gmac || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, gmac: val }));
                        if (useDefault.gmac)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.gmac ? r : { ...r, gmac: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.gmac}
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
                  {/* BRAND */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'brandId') }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], brandId: !prev[idx]?.brandId },
                          }))
                        }
                      >
                        {lockedCells[idx]?.brandId ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </IconButton>
                      <Autocomplete
                        size="small"
                        options={brandOptions}
                        getOptionLabel={(b) => b.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={brandById(row.brandId)}
                        onChange={(_, v) => handleChange(idx, 'brandId', v?.id ?? '')}
                        renderInput={(params) => (
                          <TextField {...params} error={!!rowErrors[idx]?.brandId} helperText={rowErrors[idx]?.brandId} />
                        )}
                        sx={{ minWidth: 200 }}
                      />
                    </div>
                  </TableCell>

                  {/* NAME */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'name') }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], name: !prev[idx]?.name },
                          }))
                        }
                      >
                        {lockedCells[idx]?.name ? <IconLock size={16} /> : <IconLockOpen size={16} />}
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

                  {/* IP */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'ip') }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], ip: !prev[idx]?.ip },
                          }))
                        }
                      >
                        {lockedCells[idx]?.ip ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </IconButton>
                      <TextField
                        value={row.ip}
                        onChange={(e) => handleChange(idx, 'ip', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.ip}
                        helperText={rowErrors[idx]?.ip}
                      />
                    </div>
                  </TableCell>

                  {/* GMAC */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'gmac') }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], gmac: !prev[idx]?.gmac },
                          }))
                        }
                      >
                        {lockedCells[idx]?.gmac ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </IconButton>
                      <TextField
                        value={row.gmac}
                        onChange={(e) => handleChange(idx, 'gmac', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.gmac}
                        helperText={rowErrors[idx]?.gmac}
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
            onClick={handleSaveAll}
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

export default BulkAddEditBleReader;
