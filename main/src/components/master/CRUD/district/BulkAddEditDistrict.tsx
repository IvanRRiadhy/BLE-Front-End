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
import toast from 'react-hot-toast';
import {
  addDistrict,
  editDistrict,
  fetchDistrictDT,
  DistrictType,
  addBatchDistrict,
} from 'src/store/apps/crud/district';
import { defaultDistrictForm } from 'src/store/apps/defaultForm';

type Props = {
  type: 'add' | 'edit';
  initialData?: DistrictType[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const BulkAddEditDistrict = ({ type, initialData, setSelectedIds }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const [openBulk, setOpenBulk] = useState(false);
  const [lockedRows, setLockedRows] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState<DistrictType[]>([{ ...defaultDistrictForm }]);
  const [lockedCells, setLockedCells] = useState<
    Record<number, Partial<Record<keyof DistrictType, boolean>>>
  >({});
  const districtFilter = useSelector((state: RootState) => state.districtReducer.districtFilter);
  const [columnDefaults, setColumnDefaults] = useState<Partial<DistrictType>>({});
  const [useDefault, setUseDefault] = useState<Record<keyof DistrictType, boolean>>({
    name: false,
    districtHost: false,
    code: false,
    applicationId: false,
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
      setRows([{ ...defaultDistrictForm }]);
    }
    setColumnDefaults({});
    setUseDefault({
      name: false,
      districtHost: false,
      code: false,
      applicationId: false,
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

  const handleChange = (index: number, key: keyof DistrictType, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
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
    try {
      let result;
      if (type === 'edit') {
        console.log('edit');
      } else {
        result = await dispatch(addBatchDistrict(rows));
      }

      await dispatch(fetchDistrictDT(districtFilter));
      if (setSelectedIds) setSelectedIds(new Set());
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving district:', error);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    }
  };

  const getCellStyle = (rowIndex: number, key: keyof DistrictType) => {
    const isLocked = lockedRows[rowIndex] || lockedCells[rowIndex]?.[key];
    return {
      backgroundColor: isLocked ? '#e3f2fd' : 'transparent',
    };
  };

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
      <Dialog open={openBulk} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography fontWeight={700} variant="h2" p={2}>
            Bulk Add/Edit District
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                {/** BRAND HEADER WITH DEFAULT SETTING */}

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
                {/* Code */}
                <TableCell>
                  <Typography fontWeight={600}>District Code</Typography>
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
                        const value = e.target.value;
                        const key = 'code'; // or 'code', etc.
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
                      disabled={!useDefault.code}
                    />
                  </div>
                </TableCell>

                {/* District Host */}
                <TableCell>
                  <Typography fontWeight={600}>District Host</Typography>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={useDefault.districtHost}
                      onChange={(e) =>
                        setUseDefault({ ...useDefault, districtHost: e.target.checked })
                      }
                    />
                    <TextField
                      size="small"
                      value={columnDefaults.districtHost || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const key = 'districtHost'; // or 'ip', etc.
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
                      disabled={!useDefault.districtHost}
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...getCellStyle(idx, 'code'),
                      }}
                    >
                      <TextField
                        value={row.code}
                        onChange={(e) => handleChange(idx, 'code', e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              code: !prev[idx]?.code,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.code ? (
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
                        ...getCellStyle(idx, 'districtHost'),
                      }}
                    >
                      <TextField
                        value={row.districtHost}
                        onChange={(e) => handleChange(idx, 'districtHost', e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setLockedCells((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              districtHost: !prev[idx]?.districtHost,
                            },
                          }))
                        }
                      >
                        {lockedCells[idx]?.districtHost ? (
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

export default BulkAddEditDistrict;
