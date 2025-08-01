import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid2 as Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  DialogActions,
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  bleReaderType,
  deleteBleReader,
  fetchBleReaderDT,
  UpdateFilter,
} from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import AddEditBleReader from './AddEditBleReader';
import { defaultBleReaderFilter } from 'src/store/apps/defaultForm';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Brand Name', field: 'Brand.Name', sortAble: true },
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'IP', field: 'Ip', sortAble: true },
  { label: 'GMAC', field: 'Gmac', sortAble: true },
  { label: 'Engine Reader', field: 'EngineFloorId', sortAble: true },
];

const BleReaderList = () => {
  const dispatch: AppDispatch = useDispatch();
  const bleReaderData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);
  const brandData = useSelector((state: RootState) => state.brandReducer.brands);
  // const bleReaderTotalCount = useSelector(
  //   (state: RootState) => state.bleReaderReducer.bleReaderTotalCount,
  // );
  const bleReaderFilterCount = useSelector(
    (state: RootState) => state.bleReaderReducer.bleReaderFilterCount,
  );
  // const { t } = useTranslation();

  // Pagination State
  const page = Math.floor(bleReaderFilter.Start / bleReaderFilter.Length);
  const rowsPerPage = bleReaderFilter.Length;
  const orderBy = bleReaderFilter.SortColumn;
  const order = bleReaderFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * bleReaderFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  useEffect(() => {
    dispatch(UpdateFilter(defaultBleReaderFilter));
    // dispatch(fetchBleReaders());
    dispatch(fetchBrands());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchBleReaderDT(bleReaderFilter));
  }, [bleReaderFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBle, setSelectedBle] = useState<bleReaderType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ble: bleReaderType) => {
    setSelectedBle(ble);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBle(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedBle) {
      dispatch(deleteBleReader(selectedBle.id));
    }
    handleCloseDeleteDialog();
    dispatch(fetchBleReaderDT(bleReaderFilter));
  };

  // const handleSort = (column: string) => {
  //   const isAsc = orderBy === column && order === 'asc';
  //   setOrder(isAsc ? 'desc' : 'asc');
  //   setOrderBy(column);
  // };
  const handleSort = (column: string) => {
    const isAsc = bleReaderFilter.SortColumn === column && bleReaderFilter.SortDir === 'asc';
    const isDesc = bleReaderFilter.SortColumn === column && bleReaderFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'UpdatedAt',
          SortDir: 'desc',
          Start: 0,
        }),
      );
    } else {
      dispatch(
        UpdateFilter({
          SortColumn: column,
          SortDir: isAsc ? 'desc' : 'asc',
          Start: 0,
        }),
      );
    }
  };

  const getBrandName = (brandID: string) => {
    const brand = brandData.find((b: BrandType) => b.id === brandID);
    return brand ? brand.name : 'Unknown Brand';
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          <BlankCard>
            <TableContainer>
              <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Empty Column */}
                    <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>
                      <Typography variant="h6"></Typography>
                    </TableCell>
                    {/* Main Table Header */}
                    {columns.map((col) => (
                      <TableCell key={col.label}>
                        {col.sortAble && col.field ? (
                          <TableSortLabel
                            active={orderBy === col.field}
                            direction={orderBy === col.field ? order : 'asc'}
                            onClick={() => handleSort(col.field)}
                          >
                            <Typography variant="h6">{col.label}</Typography>
                          </TableSortLabel>
                        ) : (
                          <Typography variant="h6">{col.label}</Typography>
                        )}
                      </TableCell>
                    ))}
                    {/* Right Sticky Empty Column */}
                    <TableCell
                      sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 2 }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bleReaderData.map((bleReader: bleReaderType, index) => (
                    <TableRow key={index}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{getBrandName(bleReader.brandId)}</TableCell>
                      <TableCell>{bleReader.name}</TableCell>
                      <TableCell>{bleReader.ip}</TableCell>
                      <TableCell>{bleReader.gmac}</TableCell>
                      <TableCell>{bleReader.engineReaderId}</TableCell>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          right: 0,
                          background: 'white',
                          zIndex: 2,
                          display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                        }}
                      >
                        <AddEditBleReader type="edit" bleReader={bleReader} />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(bleReader)}
                        >
                          <IconTrash size={20} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={bleReaderFilterCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Ble Reader <strong>{selectedBle?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default BleReaderList;
