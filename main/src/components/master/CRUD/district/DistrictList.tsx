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
  DialogContentText,
  DialogContent,
  DialogActions,
  Button,
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import {  DistrictType, UpdateFilter, deleteDistrict, fetchDistrictDT } from 'src/store/apps/crud/district';
import AddEditDistrict from './AddEditDistrict';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'District Code', field: '', sortAble: false },
  { label: 'District Name', field: 'name', sortAble: true },
    { label: 'District Host', field: 'districtHost', sortAble: true },
];

const DistrictList = () => {
    const dispatch: AppDispatch = useDispatch();
  const districtData: DistrictType[] = useSelector(
    (state: RootState) => state.districtReducer.districts,
  );
  // const districtTotalCount = useSelector((state: RootState) => state.districtReducer.districtTotalCount);
  const districtFilteredCount = useSelector((state: RootState) => state.districtReducer.districtFilteredCount);
  const districtFilter = useSelector((state: RootState) => state.districtReducer.districtFilter);
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(districtFilter.Start / districtFilter.Length);
const rowsPerPage = districtFilter.Length;
const orderBy = districtFilter.SortColumn;
const order = districtFilter.SortDir;

const handleChangePage = (_: unknown, newPage: number) => {
  dispatch(UpdateFilter({ Start: newPage * districtFilter.Length }));
};
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
  const newLength = parseInt(event.target.value, 10);
  dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
};
const handleSort = (column: string) => {
  const isAsc = districtFilter.SortColumn === column && districtFilter.SortDir === 'asc';
  const isDesc = districtFilter.SortColumn === column && districtFilter.SortDir === 'desc';

  if (isDesc) {
    dispatch(UpdateFilter({
      SortColumn: '',
      SortDir: 'asc',
      Start: 0,
    }));
  } else {
    dispatch(UpdateFilter({
      SortColumn: column,
      SortDir: isAsc ? 'desc' : 'asc',
      Start: 0,
    }));
  }
};


  useEffect(() => {
    dispatch(fetchDistrictDT(districtFilter));
  }, [districtFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDist, setSelectedDist] = useState<DistrictType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (dist: DistrictType) => {
    setSelectedDist(dist);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedDist(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedDist) {
      dispatch(deleteDistrict(selectedDist.id));
    }
    handleCloseDeleteDialog();
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
                  {districtData
                    .map((district, index) => (
                      <TableRow key={district.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1 + page * rowsPerPage}
                        </TableCell>
                        <TableCell>{district.code}</TableCell>
                        <TableCell>{district.name}</TableCell>
                        <TableCell>{district.districtHost}</TableCell>

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
                          <AddEditDistrict type="edit" district={district} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(district)}
                          >
                            <IconTrash size={20} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
        {/* Pagination */}
        <TablePagination
          component="div"
          count={districtFilteredCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Grid>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the distric <strong>{selectedDist?.name}</strong>?
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
export default DistrictList;
