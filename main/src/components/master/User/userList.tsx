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
import { fetchUser, UpdateFilter, userType } from 'src/store/apps/crud/users';

const columns = [
  { label: 'Username', field: 'Username', sortAble: false },
  { label: 'Email', field: 'Email', sortAble: false },
  { label: 'Email Verified', field: 'IsEmailConfirmation', sortAble: true },
  { label: 'Last Login', field: 'LastLoginAt', sortAble: true },
];

const UserList = () => {
  const dispatch: AppDispatch = useDispatch();
  const userData: userType[] = useSelector((state: RootState) => state.userReducer.users);
  const userFilteredCount = useSelector((state: RootState) => state.userReducer.userFilteredCount);
  const userFilter = useSelector((state: RootState) => state.userReducer.userFilter);
  // Pagination State
  const page = Math.floor(userFilter.Start / userFilter.Length);
  const rowsPerPage = userFilter.Length;
  const orderBy = userFilter.SortColumn;
  const order = userFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * userFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = userFilter.SortColumn === column && userFilter.SortDir === 'asc';
    const isDesc = userFilter.SortColumn === column && userFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: '',
          SortDir: 'asc',
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
    dispatch(fetchUser());
  }, [userFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedDist] = useState<userType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (dist: userType) => {
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
    if (selectedUser) {
      // dispatch(deleteUser(selectedUser.id));
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
                  {userData.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isEmailConfirmation ? 'Verified' : 'Not Verified'}
                      </TableCell>
                      <TableCell>{user.lastLoginAt}</TableCell>
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
                        {/* <AddEditDistrict type="edit" district={district} /> */}
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(user)}
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
          count={userFilteredCount}
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
            Are you sure you want to delete the User <strong>{selectedUser?.username}</strong>?
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

export default UserList;
