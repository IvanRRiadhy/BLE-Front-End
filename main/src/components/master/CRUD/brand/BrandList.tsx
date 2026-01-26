import React, { useEffect, useRef, useState } from 'react';
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
  TableSortLabel,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { BrandType, deleteBrand, fetchBrandDT, UpdateFilter } from 'src/store/apps/crud/brand';
import AddEditBrand from './AddEditBrand';
import { defaultBrandFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useBrandList, useDeleteBrand } from 'src/hooks/useBrand';

const columns = [
  { label: 'Brand Name', field: 'Name', sortAble: true },
  { label: 'Tag', field: 'Tag', sortAble: true },
];

const SKELETON_ROWS = 5;

const BrandList = () => {
  const dispatch: AppDispatch = useDispatch();
  // const brandData: BrandType[] = useSelector((state: RootState) => state.brandReducer.brands);
  // const brandTotalCount = useSelector((state: RootState) => state.brandReducer.brandTotalCount);
  // const brandFilteredCount = useSelector(
  //   (state: RootState) => state.brandReducer.brandFilteredCount,
  // );
  const brandFilter = useSelector((state: RootState) => state.brandReducer.brandFilter);
  const { data, isLoading: queryLoading } = useBrandList(brandFilter);
  const brandData = data?.data || [];
  const brandTotalCount = data?.recordsTotal || 0;
  const brandFilteredCount = data?.recordsFiltered || 0;
  const prevFilterRef = useRef(brandFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Pagination State
  const page = Math.floor(brandFilter.Start / brandFilter.Length);
  const rowsPerPage = brandFilter.Length;
  const orderBy = brandFilter.SortColumn;
  const order = brandFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * brandFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = brandFilter.SortColumn === column && brandFilter.SortDir === 'asc';
    const isDesc = brandFilter.SortColumn === column && brandFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'Name',
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
    dispatch(UpdateFilter(defaultBrandFilter));
  }, [dispatch]);

  // useEffect(() => {
  //   const prevFilter = prevFilterRef.current;
  //   const isStartOrLengthChanged =
  //     prevFilter.Start !== brandFilter.Start || prevFilter.Length !== brandFilter.Length;
  //   if (isStartOrLengthChanged) {
  //     setLoading(true);
  //   }
  //   dispatch(fetchBrandDT(brandFilter)).finally(() => {
  //     if (isStartOrLengthChanged) {
  //       setTimeout(() => {
  //         setLoading(false);
  //       }, 500);
  //     }
  //   });
  //   prevFilterRef.current = brandFilter;
  // }, [brandFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandType | null>(null);
  const deleteMutation = useDeleteBrand();
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
  const handleConfirmDelete = async () => {
    if (selectedBrand) {
      setLoading(true);
      try {
        await deleteMutation.mutateAsync(selectedBrand.id);
        toast.success('Data Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
    handleCloseDeleteDialog();
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {/* sticky index */}
          <TableCell
            sx={{
              position: 'sticky',
              left: 0,
              background: 'white',
              zIndex: 1,
              width: 35,
              minWidth: 35,
              maxWidth: 35,
            }}
          >
            <Skeleton variant="text" width={18} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          {/* right actions */}
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              background: 'white',
              zIndex: 2,
              width: 150,
              minWidth: 150,
              maxWidth: 150,
            }}
          >
            <Box display="flex" gap={1}>
              <Skeleton variant="rounded" width={90} height={32} />
              {/* <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} /> */}
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          <BlankCard>
            <TableContainer  sx={{
              maxHeight: '55vh',
            }}>
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
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
                  {queryLoading 
                  ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                  : brandData.map((brand, index) => (
                    <TableRow key={index}>
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
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{brand.name}</TableCell>
                      <TableCell>{brand.tag}</TableCell>

                      <TableCell
                        sx={{
                          position: 'sticky',
                          right: 0,
                          background: 'white',
                          zIndex: 1,
                          // display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                          width: 150, // Fixed width
                          minWidth: 150,
                          maxWidth: 150,
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
            {/* Pagination */}
            <TablePagination
              component="div"
              count={brandFilteredCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[5, 10, 25]}
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
