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
import { useAddBatchDistrict, useEditDistrict } from 'src/hooks/useDistrict';
import { useQueryClient } from '@tanstack/react-query';
import type { DistrictType } from 'src/store/apps/crud/district';

// Default form for District
const defaultDistrictForm: Partial<DistrictType> = {
  id: '',
  code: '',
  name: '',
  districtHost: '',
  applicationId: '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

type Props = {
  type: 'add' | 'edit';
  initialData?: DistrictType[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const BulkAddEditDistrict = ({ type, initialData, setSelectedIds }: Props) => {
  const [openBulk, setOpenBulk] = useState(false);
  const [rows, setRows] = useState<Partial<DistrictType>[]>([{ ...defaultDistrictForm }]);
  const [lockedCells, setLockedCells] = useState<
    Record<number, Partial<Record<keyof DistrictType, boolean>>>
  >({});
  const [lockedRows, setLockedRows] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const [columnDefaults, setColumnDefaults] = useState<Partial<DistrictType>>({});
  const [useDefault, setUseDefault] = useState<Record<keyof DistrictType, boolean>>({
    code: false,
    name: false,
    districtHost: false,
    applicationId: false,
    id: false,
    createdBy: false,
    createdAt: false,
    updatedBy: false,
    updatedAt: false,
  });

  const queryClient = useQueryClient();
  const addBatchMutation = useAddBatchDistrict();
  const editMutation = useEditDistrict();

  // ───────────────────────────────
  // Dialog controls
  // ───────────────────────────────
  const handleClickOpen = () => {
    if (type === 'edit' && initialData && initialData.length > 0) {
      setRows(initialData);
    } else {
      setRows([{ ...defaultDistrictForm }]);
    }
    setColumnDefaults({});
    setRowErrors({});
    setUseDefault({
      code: false,
      name: false,
      districtHost: false,
      applicationId: false,
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
  const handleChange = (index: number, key: keyof DistrictType, value: string) => {
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
        ...defaultDistrictForm,
        ...Object.fromEntries(
          Object.entries(columnDefaults).filter(([key]) => useDefault[key as keyof DistrictType]),
        ),
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const getCellStyle = (rowIndex: number, key: keyof DistrictType) => {
    const isLocked = lockedRows[rowIndex] || lockedCells[rowIndex]?.[key];
    return {
      backgroundColor: isLocked ? 'info.light' : 'transparent',
    };
  };

  // ───────────────────────────────
  // Validation
  // ───────────────────────────────
  const validateAllRows = (): boolean => {
    const errors: Record<number, Record<string, string>> = {};
    rows.forEach((r, idx) => {
      const e: Record<string, string> = {};
      if (!r.code?.trim()) e.code = 'Code is required';
      if (!r.name?.trim()) e.name = 'Name is required';
      if (!r.districtHost?.trim()) e.districtHost = 'District Host is required';
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
  // Save All - Using Batch API for Add
  // ───────────────────────────────
  const handleSaveAll = async () => {
    if (!validateAllRows()) return;
    setIsSaving(true);

    try {
      if (type === 'add') {
        // Use batch API for adding multiple districts
        await addBatchMutation.mutateAsync(rows);
        toast.success(`${rows.length} district(s) added successfully`);
      } else {
        // For edit, we still need to loop through individual updates
        // since we don't have a batch edit API
        let successCount = 0;
        let failCount = 0;

        const promises = rows.map(async (row) => {
          try {
            if (row.id) {
              await editMutation.mutateAsync(row);
              successCount++;
            }
          } catch {
            failCount++;
          }
        });

        await Promise.allSettled(promises);

        if (failCount === 0) {
          toast.success(`${successCount} district(s) updated successfully`);
        } else {
          if (successCount > 0) {
            toast.success(`${successCount} district(s) updated, ${failCount} failed`);
          }
          toast.error(`${failCount} district(s) failed to update`);
        }
      }

      // Refresh cache
      await queryClient.invalidateQueries({ queryKey: ['district-list'] });
      await queryClient.invalidateQueries({ queryKey: ['district-all'] });
      
      if (setSelectedIds) setSelectedIds(new Set());
      handleClose();
    } catch (err) {
      console.error('Bulk save failed:', err);
      toast.error('An error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  // ───────────────────────────────
  // UI
  // ───────────────────────────────
  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Bulk Edit District">
          <IconButton color="default" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Bulk Add District">
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
            Bulk {type === 'add' ? 'Add' : 'Edit'} District
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
                {/* CODE HEADER WITH DEFAULT */}
                <TableCell>
                  <Typography fontWeight={600}>Code</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.code}
                      onChange={(e) => setUseDefault({ ...useDefault, code: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.code || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, code: val }));
                        if (useDefault.code)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.code ? r : { ...r, code: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.code}
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

                {/* DISTRICT HOST HEADER */}
                <TableCell>
                  <Typography fontWeight={600}>District Host</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.districtHost}
                      onChange={(e) => setUseDefault({ ...useDefault, districtHost: e.target.checked })}
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.districtHost || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, districtHost: val }));
                        if (useDefault.districtHost)
                          setRows((prev) =>
                            prev.map((r, i) =>
                              lockedRows[i] || lockedCells[i]?.districtHost ? r : { ...r, districtHost: val },
                            ),
                          );
                      }}
                      disabled={!useDefault.districtHost}
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
                <TableRow key={idx} sx={{ backgroundColor: lockedRows[idx] ? 'info.light' : 'background.paper' }}>
                  {/* CODE */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'code') }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], code: !prev[idx]?.code },
                          }))
                        }
                      >
                        {lockedCells[idx]?.code ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </IconButton>
                      <TextField
                        value={row.code || ''}
                        onChange={(e) => handleChange(idx, 'code', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.code}
                        helperText={rowErrors[idx]?.code}
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
                        value={row.name || ''}
                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.name}
                        helperText={rowErrors[idx]?.name}
                      />
                    </div>
                  </TableCell>

                  {/* DISTRICT HOST */}
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'districtHost') }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: { ...prev[idx], districtHost: !prev[idx]?.districtHost },
                          }))
                        }
                      >
                        {lockedCells[idx]?.districtHost ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </IconButton>
                      <TextField
                        value={row.districtHost || ''}
                        onChange={(e) => handleChange(idx, 'districtHost', e.target.value)}
                        fullWidth
                        error={!!rowErrors[idx]?.districtHost}
                        helperText={rowErrors[idx]?.districtHost}
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
                                ? { code: true, name: true, districtHost: true, applicationId: true }
                                : {},
                            }));
                          }}
                          sx={{ color: lockedRows[idx] ? 'primary.main' : 'inherit' }}
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
            {type === 'add' ? 'Add All' : 'Update All'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkAddEditDistrict;