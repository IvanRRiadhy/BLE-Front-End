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
  DialogActions,
  Button,
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  // fetchAccessControls,
  AccessControlType,
  deleteAccessControl,
  fetchAccessControlsDT,
  UpdateFilter,
} from 'src/store/apps/crud/accessControl';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import AddEditAccessControl from './AddEditAccesControl';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Brand Name', field: 'Building.Name', sortAble: true },
  { label: 'Access Control Name', field: 'name', sortAble: true },
  { label: 'Type', field: 'type', sortAble: true },
  { label: 'Description', field: '', sortAble: false },
  { label: 'Channel', field: 'channel', sortAble: true },
  { label: 'Door ID', field: 'doorId', sortAble: true },
  { label: 'Raw', field: '', sortAble: false },
  { label: 'Integration Name', field: 'Integration.Name', sortAble: true },
];

const AccessControlList = () => {
    const dispatch: AppDispatch = useDispatch();
  const accessControlData: AccessControlType[] = useSelector(
    (state: RootState) => state.accessControlReducer.accessControls,
  );
  // const accessControlTotalCount = useSelector(
  //   (state: RootState) => state.accessControlReducer.accessControlTotalCount,
  // );
  const accessControlFilteredCount = useSelector(
    (state: RootState) => state.accessControlReducer.accessControlFilteredCount,
  );
  const accessControlFilter = useSelector(
    (state: RootState) => state.accessControlReducer.accessControlFilter,
  )
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(accessControlFilter.Start / accessControlFilter.Length);
const rowsPerPage = accessControlFilter.Length;
const orderBy = accessControlFilter.SortColumn;
const order = accessControlFilter.SortDir;

const handleChangePage = (_: unknown, newPage: number) => {
  dispatch(UpdateFilter({ Start: newPage * accessControlFilter.Length }));
};
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
  const newLength = parseInt(event.target.value, 10);
  dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
};

  useEffect(() => {
    dispatch(fetchAccessControlsDT(accessControlFilter));
  }, [accessControlFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<AccessControlType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (control: AccessControlType) => {
    setSelectedControl(control);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedControl(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedControl) {
      dispatch(deleteAccessControl(selectedControl.id));
    }
    handleCloseDeleteDialog();
  };
const handleSort = (column: string) => {
  const isAsc = accessControlFilter.SortColumn === column && accessControlFilter.SortDir === 'asc';
  const isDesc = accessControlFilter.SortColumn === column && accessControlFilter.SortDir === 'desc';

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
                  {accessControlData.map((accessControl, index) => (
                    <TableRow key={index}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{accessControl.brand?.name}</TableCell>
                      <TableCell>{accessControl.name}</TableCell>
                      <TableCell>{accessControl.type}</TableCell>
                      <TableCell>{accessControl.description}</TableCell>
                      <TableCell>{accessControl.channel}</TableCell>
                      <TableCell>{accessControl.doorId}</TableCell>
                      <TableCell>{accessControl.raw}</TableCell>
                      <TableCell>{accessControl.integration?.integrationType}</TableCell>

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
                        <AddEditAccessControl type="edit" accessControl={accessControl} />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(accessControl)}
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
          count={accessControlFilteredCount}
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
            Are you sure you want to delete the Access Control{' '}
            <strong>{selectedControl?.name}</strong>?
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

export default AccessControlList;
