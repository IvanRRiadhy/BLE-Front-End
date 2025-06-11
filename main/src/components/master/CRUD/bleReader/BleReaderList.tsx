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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { fetchBleReaders, bleReaderType, deleteBleReader } from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import AddEditBleReader from './AddEditBleReader';
import { useTranslation } from 'react-i18next';

const BleReaderList = () => {
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
  const bleReaderData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const brandData = useSelector((state: RootState) => state.brandReducer.brands);

  useEffect(() => {
    dispatch(fetchBleReaders());
    dispatch(fetchBrands());
  }, [dispatch]);

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
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
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
                    {[
                      'Brand Name',
                      'Name',
                      'MAC',
                      'IP',
                      'locationX',
                      'locationY',
                      'locationPxX',
                      'locationPxY',
                      'engineReaderId',
                    ].map((header) => (
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
                  {bleReaderData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((bleReader: bleReaderType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{getBrandName(bleReader.brandId)}</TableCell>
                        <TableCell>{bleReader.name}</TableCell>
                        <TableCell>{bleReader.mac}</TableCell>
                        <TableCell>{bleReader.ip}</TableCell>
                        <TableCell>{bleReader.locationX}</TableCell>
                        <TableCell>{bleReader.locationY}</TableCell>
                        <TableCell>{bleReader.locationPxX}</TableCell>
                        <TableCell>{bleReader.locationPxY}</TableCell>
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
              count={bleReaderData.length}
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
