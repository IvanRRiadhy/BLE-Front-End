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
  DialogContent,
  DialogTitle,
  DialogContentText,
  DialogActions,
  Button,
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import {
  DepartmentType,
  UpdateFilter,
  deleteDepartment,
  fetchDepartmentDT,
} from 'src/store/apps/crud/department';
import AddEditDepartment from './AddEditDepartment';
import { defaultDepartmentFilter } from 'src/store/apps/defaultForm';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Department Code', field: '', sortAble: false },
  { label: 'Department Name', field: 'Name', sortAble: true },
  { label: 'Department Host', field: 'DepartmentHost', sortAble: true },
];

const DepartmentList = () => {
  const dispatch: AppDispatch = useDispatch();
  const departmentData: DepartmentType[] = useSelector(
    (state: RootState) => state.departmentReducer.departments,
  );
  // const departmentTotalCount = useSelector((state: RootState) => state.departmentReducer.departmentTotalCount);
  const departmentFilteredCount = useSelector(
    (state: RootState) => state.departmentReducer.departmentFilteredCount,
  );
  const departmentFilter = useSelector(
    (state: RootState) => state.departmentReducer.departmentFilter,
  );
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(departmentFilter.Start / departmentFilter.Length);
  const rowsPerPage = departmentFilter.Length;
  const orderBy = departmentFilter.SortColumn;
  const order = departmentFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * departmentFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = departmentFilter.SortColumn === column && departmentFilter.SortDir === 'asc';
    const isDesc = departmentFilter.SortColumn === column && departmentFilter.SortDir === 'desc';

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

  useEffect(() => {
    dispatch(UpdateFilter(defaultDepartmentFilter));
  }, [ dispatch]);

  useEffect(() => {
    dispatch(fetchDepartmentDT(departmentFilter));
  }, [departmentFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (dept: DepartmentType) => {
    setSelectedDept(dept);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedDept(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedDept) {
      dispatch(deleteDepartment(selectedDept.id));
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
                  {departmentData.map((department, index) => (
                    <TableRow key={department.id}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{department.code}</TableCell>
                      <TableCell>{department.name}</TableCell>
                      <TableCell>{department.departmentHost}</TableCell>

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
                        <AddEditDepartment type="edit" department={department} />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(department)}
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
          count={departmentFilteredCount}
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
            Are you sure you want to delete the application <strong>{selectedDept?.name}</strong>?
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
export default DepartmentList;
