// BulkAddEditBleReader.tsx
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
  MenuItem,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { IconPencil, IconPlus, IconTrash, IconLock, IconLockOpen } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector, AppDispatch, RootState } from 'src/store/Store';
import {
  addBleReader,
  editBleReader,
  fetchBleReaderDT,
  bleReaderType,
} from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import toast from 'react-hot-toast';
import { defaultBleReaderForm } from 'src/store/apps/defaultForm';

type Props = {
  type: 'add' | 'edit';
  initialData?: bleReaderType[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const BulkAddEditBleReader = ({ type, initialData, setSelectedIds }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const [openBulk, setOpenBulk] = useState(false);
  const [rows, setRows] = useState<bleReaderType[]>([{ ...defaultBleReaderForm }]);
  const [lockedCells, setLockedCells] = useState<
    Record<number, Partial<Record<keyof bleReaderType, boolean>>>
  >({});
  const [lockedRows, setLockedRows] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const brands = useSelector((state: RootState) => state.brandReducer.brandAll);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);
  const [columnDefaults, setColumnDefaults] = useState<Partial<bleReaderType>>({});
  const [useDefault, setUseDefault] = useState<Record<keyof bleReaderType, boolean>>({
    brandId: false,
    name: false,
    ip: false,
    engineReaderId: false,
    gmac: false,
    id: false,
    createdBy: false,
    createdAt: false,
    updatedBy: false,
    updatedAt: false,
  });

  const handleClickOpen = () => {
    if (type === 'edit' && initialData && initialData.length > 0) {
      setRows(initialData);
    } else {
      setRows([{ ...defaultBleReaderForm }]);
    }
    setColumnDefaults({});
    setUseDefault({
      brandId: false,
      name: false,
      ip: false,
      engineReaderId: false,
      gmac: false,
      id: false,
      createdBy: false,
      createdAt: false,
      updatedBy: false,
      updatedAt: false,
    });
    setOpenBulk(true);
  };
  const handleClose = () => {
    setOpenBulk(false);
  };

  useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  const handleChange = (index: number, key: keyof bleReaderType, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
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
    // Remove the row
    setRows((prevRows) => {
      const newRows = prevRows.filter((_, i) => i !== index);

      // Rebuild lockedCells and lockedRows for the new indices
      const newLockedCells: typeof lockedCells = {};
      const newLockedRows: typeof lockedRows = {};

      Object.entries(lockedCells).forEach(([key, value]) => {
        const i = parseInt(key, 10);
        if (i < index) newLockedCells[i] = value;
        else if (i > index) newLockedCells[i - 1] = value; // shift index down
      });

      Object.entries(lockedRows).forEach(([key, value]) => {
        const i = parseInt(key, 10);
        if (i < index) newLockedRows[i] = value;
        else if (i > index) newLockedRows[i - 1] = value; // shift index down
      });

      setLockedCells(newLockedCells);
      setLockedRows(newLockedRows);

      return newRows;
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    let allSuccess = true;
    let successCount = 0;
    let failCount = 0;
    for (const row of rows) {
      let result;
      if (row.id) {
        result = await dispatch(editBleReader(row));
      } else {
        result = await dispatch(addBleReader(row));
      }

      if (!result || !result.type?.endsWith('/fulfilled')) {
        allSuccess = false;
        failCount += 1;
      } else {
        successCount += 1;
      }
    }

    await dispatch(fetchBleReaderDT(bleReaderFilter));
    if(setSelectedIds) setSelectedIds(new Set());

    if (allSuccess) {
      toast.success(
        `All ${successCount} item(s) ${type === 'add' ? 'added' : 'updated'} successfully`,
      );
      handleClose();
    } else {
      toast.success(`${successCount} item(s) ${type === 'add' ? 'added' : 'updated'} successfully`);
      toast.error(`${failCount} item(s) failed to ${type === 'add' ? 'add' : 'update'}`);
    }
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  const getCellStyle = (rowIndex: number, key: keyof bleReaderType) => {
    const isLocked = lockedRows[rowIndex] || lockedCells[rowIndex]?.[key];
    return {
      backgroundColor: isLocked ? '#e3f2fd' : 'transparent',
    };
  };

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
          <Typography fontWeight={700} variant="h2" p={2}>
            Bulk Add/Edit BLE Reader
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                {/** BRAND HEADER WITH DEFAULT SETTING */}
                <TableCell>
                  <Typography fontWeight={600}>Brand</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.brandId}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDefault((prev) => ({ ...prev, brandId: checked }));

                        // Apply default if already selected
                        if (checked && columnDefaults.brandId) {
                          const value = columnDefaults.brandId;
                          setRows((prev) =>
                            prev.map((row, index) => {
                              if (lockedRows[index] || lockedCells[index]?.brandId) return row;
                              return { ...row, brandId: value };
                            }),
                          );
                        }
                      }}
                    />

                    <TextField
                      select
                      size="small"
                      value={columnDefaults.brandId || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setColumnDefaults((prev) => ({ ...prev, brandId: value }));

                        // Only apply if checkbox is checked and not locked
                        if (useDefault.brandId) {
                          setRows((prev) =>
                            prev.map((row, index) => {
                              if (lockedRows[index] || lockedCells[index]?.brandId) return row;
                              return { ...row, brandId: value };
                            }),
                          );
                        }
                      }}
                      disabled={!useDefault.brandId}
                    >
                      {brands.map((brand) => (
                        <MenuItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                </TableCell>

                {/** NAME HEADER */}
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
                        const value = e.target.value;
                        const key = 'name'; // or 'ip', etc.
                        setColumnDefaults((prev) => ({ ...prev, [key]: value }));
                        if (useDefault[key]) {
                          setRows((prevRows) =>
                            prevRows.map((row, index) => {
                              if (lockedRows[index] || lockedCells[index]?.[key]) return row;
                              return { ...row, [key]: value };
                            }),
                          );
                        }
                      }}
                      disabled={!useDefault.name}
                    />
                  </div>
                </TableCell>

                {/** Repeat similar for IP, engineReaderId, gmac */}
                {/* IP */}
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
                        const value = e.target.value;
                        const key = 'ip'; // or 'ip', etc.
                        setColumnDefaults((prev) => ({ ...prev, [key]: value }));
                        if (useDefault[key]) {
                          setRows((prevRows) =>
                            prevRows.map((row, index) => {
                              if (lockedRows[index] || lockedCells[index]?.[key]) return row;
                              return { ...row, [key]: value };
                            }),
                          );
                        }
                      }}
                      disabled={!useDefault.ip}
                    />
                  </div>
                </TableCell>

                {/* Engine Reader ID */}
                <TableCell>
                  <Typography fontWeight={600}>Engine Reader ID</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.engineReaderId}
                      onChange={(e) =>
                        setUseDefault({ ...useDefault, engineReaderId: e.target.checked })
                      }
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.engineReaderId || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const key = 'engineReaderId'; // or 'ip', etc.
                        setColumnDefaults((prev) => ({ ...prev, [key]: value }));
                        if (useDefault[key]) {
                          setRows((prevRows) =>
                            prevRows.map((row, index) => {
                              if (lockedRows[index] || lockedCells[index]?.[key]) return row;
                              return { ...row, [key]: value };
                            }),
                          );
                        }
                      }}
                      disabled={!useDefault.engineReaderId}
                    />
                  </div>
                </TableCell>

                {/* GMAC */}
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
                        const value = e.target.value;
                        const key = 'gmac'; // or 'ip', etc.
                        setColumnDefaults((prev) => ({ ...prev, [key]: value }));
                        if (useDefault[key]) {
                          setRows((prevRows) =>
                            prevRows.map((row, index) => {
                              if (lockedRows[index] || lockedCells[index]?.[key]) return row;
                              return { ...row, [key]: value };
                            }),
                          );
                        }
                      }}
                      disabled={!useDefault.gmac}
                    />
                  </div>
                </TableCell>

                {/* Action */}
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
                <TableRow
                  key={idx}
                  sx={{ backgroundColor: lockedRows[idx] ? '#e3f2fd' : 'transparent' }}
                >
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'brandId'),
                      }}
                    >
                      <TextField
                        select
                        value={row.brandId || ''}
                        onChange={(e) => handleChange(idx, 'brandId', e.target.value)}
                        fullWidth
                      >
                        {brands.map((brand) => (
                          <MenuItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              brandId: !prev[idx]?.brandId,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.brandId ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'name'),
                      }}
                    >
                      <TextField
                        value={row.name}
                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              name: !prev[idx]?.name,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.name ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      style={{ display: 'flex', alignItems: 'center', ...getCellStyle(idx, 'ip') }}
                    >
                      <TextField
                        value={row.ip}
                        onChange={(e) => handleChange(idx, 'ip', e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              ip: !prev[idx]?.ip,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.ip ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                      </IconButton>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'engineReaderId'),
                      }}
                    >
                      <TextField
                        value={row.engineReaderId}
                        onChange={(e) => handleChange(idx, 'engineReaderId', e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              engineReaderId: !prev[idx]?.engineReaderId,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.engineReaderId ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'gmac'),
                      }}
                    >
                      <TextField
                        value={row.gmac}
                        onChange={(e) => handleChange(idx, 'gmac', e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              gmac: !prev[idx]?.gmac,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.gmac ? (
                          <IconLock size={16} />
                        ) : (
                          <IconLockOpen size={16} />
                        )}
                      </IconButton>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tooltip title={lockedRows[idx] ? 'Unlock Row' : 'Lock Row'}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const isLocked = !lockedRows[idx];
                            setLockedRows((prev) => ({ ...prev, [idx]: isLocked }));
                            setLockedCells((prevCells) => ({
                              ...prevCells,
                              [idx]: isLocked
                                ? {
                                    brandId: true,
                                    name: true,
                                    ip: true,
                                    engineReaderId: true,
                                    gmac: true,
                                  }
                                : {},
                            }));
                          }}
                          sx={{
                            color: lockedRows[idx] ? '#1976d2' : 'inherit', // Blue if locked
                          }}
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
            onClick={() => {
              setIsSaving(true);
              handleSaveAll();
            }}
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
