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
import {
  blacklistType,
  deleteBlacklist,
  fetchBlacklistDT,
  UpdateFilter,
} from 'src/store/apps/crud/blacklist';
import { fetchVisitor } from 'src/store/apps/crud/visitor';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import AddEditBlacklist from './AddEditBlacklist';
import { defaultBlaclistFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Blacklisted Visitor', field: 'Visitor.Name', sortAble: true },
  { label: 'Blacklisted Area', field: 'MaskedArea.Name', sortAble: true },
];

const BlacklistList = () => {
  const dispatch: AppDispatch = useDispatch();
  const blaclistData = useSelector((state: RootState) => state.blacklistReducer.blacklists);
  const blacklistTotalCount = useSelector((state: RootState) => state.blacklistReducer.blacklistTotalCount);
  // const blacklistFilteredCount = useSelector(
  //   (state: RootState) => state.blacklistReducer.blacklistFilteredCount,
  // );
  const blacklistFilter = useSelector((state: RootState) => state.blacklistReducer.blacklistFilter);
  const hasLoaded = useSelector((state: RootState) => state.blacklistReducer.hasLoaded);
  // Pagination State
  const page = Math.floor(blacklistFilter.Start / blacklistFilter.Length);
  const rowsPerPage = blacklistFilter.Length;
  const orderBy = blacklistFilter.SortColumn;
  const order = blacklistFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * blacklistFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = blacklistFilter.SortColumn === column && blacklistFilter.SortDir === 'asc';
    const isDesc = blacklistFilter.SortColumn === column && blacklistFilter.SortDir === 'desc';

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
    dispatch(UpdateFilter(defaultBlaclistFilter));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchBlacklistDT(blacklistFilter));
  }, [blacklistFilter, dispatch]);

  useEffect(() => {
    dispatch(fetchVisitor());
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloorplan());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBList, setSelectedBList] = useState<blacklistType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (bl: blacklistType) => {
    setSelectedBList(bl);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBList(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedBList) {
      dispatch(deleteBlacklist(selectedBList.id));
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
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 35, // Fixed width
                        minWidth: 35,
                        maxWidth: 35,
                      }}
                    >
                      <Typography variant="h6"> </Typography>
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
                      sx={{
                        position: 'sticky',
                        right: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 150, // Fixed width
                        minWidth: 150,
                        maxWidth: 150,
                      }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blaclistData.map((blacklist: blacklistType, index: any) => (
                    <TableRow key={blacklist.id}>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          background: 'white',
                          zIndex: 1,
                          width: 35, // Fixed width
                          minWidth: 35,
                          maxWidth: 35,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {' '}
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{blacklist.visitor?.name}</TableCell>
                      <TableCell>{blacklist.floorplanMaskedArea?.name}</TableCell>

                      <TableCell
                        sx={{
                          position: 'sticky',
                          right: 0,
                          background: 'white',
                          zIndex: 2,
                          display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                          width: 150, // Fixed width
                          minWidth: 150,
                          maxWidth: 150,
                        }}
                      >
                        <AddEditBlacklist type="edit" blacklist={blacklist} />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(blacklist)}
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
          count={blacklistTotalCount}
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
            Are you sure you want to delete Blacklist <strong>{selectedBList?.id}</strong>?
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

export default BlacklistList;
