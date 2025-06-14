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
import { fetchAccessCCTV, CCTVType, deleteCCTV } from 'src/store/apps/crud/accessCCTV';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import AddEditAccessCCTV from './AddEditAccessCCTV';
import { useTranslation } from 'react-i18next';

const AccessCCTVList = () => {
  const { t } = useTranslation();
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
  const CCTVData: CCTVType[] = useSelector((state: RootState) => state.CCTVReducer.cctvs);

  useEffect(() => {
    dispatch(fetchAccessCCTV());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (cctv: CCTVType) => {
    setSelectedCCTV(cctv);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedCCTV(null);
  };

  const handleConfirmDelete = () => {
    if (selectedCCTV) {
      dispatch(deleteCCTV(selectedCCTV.id));
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
                      <Typography variant="h6"> </Typography>
                    </TableCell>
                    {['Name', 'RTSP', 'Integration'].map((header) => (
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
                  {CCTVData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(
                    (cctv, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{cctv.name}</TableCell>
                        <TableCell>{cctv.rtsp}</TableCell>
                        <TableCell>{cctv.integration?.integrationType}</TableCell>
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
                          <AddEditAccessCCTV type="edit" cctv={cctv} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(cctv)}
                          >
                            <IconTrash size={20} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
        {/* Pagination */}
        <TablePagination
          component="div"
          count={CCTVData.length}
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
            Are you sure you want to delete the Access CCTV <strong>{selectedCCTV?.name}</strong>?
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

export default AccessCCTVList;
