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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { fetchBlacklist, blacklistType, deleteBlacklist } from 'src/store/apps/crud/blacklist';
import { fetchVisitor, visitorType } from 'src/store/apps/crud/visitor';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import AddEditBlacklist from './AddEditBlacklist';

const BlacklistList = () => {
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 rows per page
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(event);
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const dispatch: AppDispatch = useDispatch();
  const blaclistData = useSelector((state: RootState) => state.blacklistReducer.blacklists);
  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);

  useEffect(() => {
    dispatch(fetchBlacklist());
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

  const getVisitorName = (visitorId: string) => {
    const visitor = visitorData.find((vis: visitorType) => vis.id === visitorId);
    return visitor ? visitor.name : 'Unknown Visitor';
  };
  const getFloorName = (floorId: string) => {
    const floor = maskedAreaData.find((fl: MaskedAreaType) => fl.id === floorId);
    console.log('Mask Area: ', floor);
    return floor ? floor.name : 'Unknown Floor';
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
                      <Typography variant="h6"> </Typography>
                    </TableCell>
                    {[ 'Blacklisted Visitor', 'Blacklisted Area'].map((header) => (
                      <TableCell key={header}>
                        <Typography variant="h6">{header}</Typography>
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
                  {blaclistData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((blacklist,index) => (
                      <TableRow key={blacklist.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        > {index + 1}</TableCell>
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
          count={blaclistData.length}
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
