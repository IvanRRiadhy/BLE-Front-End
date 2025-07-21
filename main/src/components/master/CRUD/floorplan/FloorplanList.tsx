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
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {  FloorplanType, UpdateFilter, deleteFloorplan, fetchFloorplanDT } from 'src/store/apps/crud/floorplan';
// import { useTranslation } from 'react-i18next';
import AddEditFloorplan from './AddEditFloorplan';

const columns = [
    { label: 'Floorplan Name', field: 'name', sortAble: true },
  { label: 'Floor Name', field: 'Floor.Name', sortAble: true },
];

const FloorplanList = () => {
    const dispatch: AppDispatch = useDispatch();
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  // const floorplanTotalCount = useSelector((state: RootState) => state.floorplanReducer.floorplanTotalCount);
  const floorplanFilteredCount = useSelector((state: RootState) => state.floorplanReducer.floorplanFilteredCount);
const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(floorplanFilter.Start / floorplanFilter.Length);
const rowsPerPage = floorplanFilter.Length;
const orderBy = floorplanFilter.SortColumn;
const order = floorplanFilter.SortDir;

const handleChangePage = (_: unknown, newPage: number) => {
  dispatch(UpdateFilter({ Start: newPage * floorplanFilter.Length }));
};
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
  const newLength = parseInt(event.target.value, 10);
  dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
};
  const handleSort = (column: string) => {
  const isAsc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === 'asc';
  dispatch(UpdateFilter({
    SortColumn: column,
    SortDir: isAsc ? 'desc' : 'asc',
    Start: 0,
  }));
};

// useEffect(() => {
//   console.log("Floorplan Data:", floorplanData);
// }, [floorplanData]);

  useEffect(() => {
    dispatch(fetchFloorplanDT(floorplanFilter));
  }, [floorplanFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFloorplan, setSelectedFloorplan] = useState<FloorplanType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (floorplan: FloorplanType) => {
    setSelectedFloorplan(floorplan);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedFloorplan(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedFloorplan) {
      dispatch(deleteFloorplan(selectedFloorplan.id));
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
                  {floorplanData
                    .map((floorplan: FloorplanType, index: number) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1 + page * rowsPerPage}
                        </TableCell>
                        <TableCell>{floorplan.name}</TableCell>
                        <TableCell>{floorplan.floor?.name}</TableCell>
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
                          <AddEditFloorplan type="edit" floorplan={floorplan} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(floorplan)}
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
              count={floorplanFilteredCount}
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
            Are you sure you want to delete the floor <strong>{selectedFloorplan?.name}</strong>?
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

export default FloorplanList;
