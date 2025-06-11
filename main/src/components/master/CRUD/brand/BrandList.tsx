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
  DialogActions,
  Button,
  DialogContentText,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { fetchBrands, BrandType, deleteBrand } from 'src/store/apps/crud/brand';
import AddEditBrand from './AddEditBrand';

const BrandList = () => {
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
  const brandData: BrandType[] = useSelector((state: RootState) => state.brandReducer.brands);

  useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (brand: BrandType) => {
    setSelectedBrand(brand);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBrand(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedBrand) {
      dispatch(deleteBrand(selectedBrand.id));
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
                    {[ 'Brand Name', 'Brand Tag'].map((header) => (
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
                  {brandData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((brand, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{brand.name}</TableCell>
                        <TableCell>{brand.tag}</TableCell>

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
                          <AddEditBrand type="edit" brand={brand} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(brand)}
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
          count={brandData.length}
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
            Are you sure you want to delete the brand <strong>{selectedBrand?.name}</strong>?
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
export default BrandList;
