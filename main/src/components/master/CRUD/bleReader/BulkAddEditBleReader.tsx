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
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
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
};

const BulkAddEditBleReader = ({ type }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const [openBulk, setOpenBulk] = useState(false);
  const [rows, setRows] = useState<bleReaderType[]>([{ ...defaultBleReaderForm }]);
  const [isSaving, setIsSaving] = useState(false);
  const brands = useSelector((state: RootState) => state.brandReducer.brands);
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
    setRows([{ ...defaultBleReaderForm }]);
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
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    let allSuccess = true;
    for (const row of rows) {
      let result;
      if (row.id) {
        result = await dispatch(editBleReader(row));
      } else {
        result = await dispatch(addBleReader(row));
      }

      if (!result || !result.type?.endsWith('/fulfilled')) {
        allSuccess = false;
      }
    }

    await dispatch(fetchBleReaderDT(bleReaderFilter));
    setIsSaving(false);

    if (allSuccess) {
      toast.success('All data saved successfully');
      handleClose();
    } else {
      toast.error('Some data failed to save');
    }
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit BLE Reader">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add BLE Reader">
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
          <Typography fontWeight={700} variant="h4">
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
                        if (checked && columnDefaults.brandId) {
                          setRows((prev) =>
                            prev.map((row) => ({ ...row, brandId: columnDefaults.brandId! })),
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
                        if (useDefault.brandId) {
                          setRows((prev) => prev.map((row) => ({ ...row, brandId: value })));
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
                          setRows((prevRows) => prevRows.map((row) => ({ ...row, [key]: value })));
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
                          setRows((prevRows) => prevRows.map((row) => ({ ...row, [key]: value })));
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
                          setRows((prevRows) => prevRows.map((row) => ({ ...row, [key]: value })));
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
                          setRows((prevRows) => prevRows.map((row) => ({ ...row, [key]: value })));
                        }
                      }}
                      disabled={!useDefault.gmac}
                    />
                  </div>
                </TableCell>

                {/* Action */}
                <TableCell>
                  <Tooltip title="Add row">
                    <IconButton onClick={handleAddRow}>
                      <IconPlus size={20} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.name}
                      onChange={(e) => handleChange(idx, 'name', e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.ip}
                      onChange={(e) => handleChange(idx, 'ip', e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.engineReaderId}
                      onChange={(e) => handleChange(idx, 'engineReaderId', e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.gmac}
                      onChange={(e) => handleChange(idx, 'gmac', e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Delete row">
                      <IconButton color="error" onClick={() => handleRemoveRow(idx)}>
                        <IconTrash size={20} />
                      </IconButton>
                    </Tooltip>
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
