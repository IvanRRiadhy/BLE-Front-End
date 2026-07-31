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
  Collapse,
  Paper,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash, IconChevronDown, IconChevronRight, IconPlus, IconExternalLink } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { BrandType, deleteBrand, fetchBrandDT, UpdateFilter } from 'src/store/apps/crud/brand';
import AddEditBrand from './AddEditBrand';
import { defaultBrandFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useBrandList, useDeleteBrand } from 'src/hooks/useBrand';
import { useAllReaders, useDeleteReader } from 'src/hooks/useReader';
import { useNavigate } from 'react-router';
import AddEditBleReader from '../bleReader/AddEditBleReader';
import { bleReaderType, SelectBleReader } from 'src/store/apps/crud/bleReader';


const columns = [
  { label: 'Brand Name', field: 'Name', sortAble: true },
  { label: 'Tag', field: 'Tag', sortAble: true },
];

const ReaderTable = ({
  readers,
  onDeleteClick,
}: {
  readers: bleReaderType[];
  onDeleteClick: (reader: bleReaderType) => void;
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <TableContainer sx={{ maxHeight: "250px", overflowY: "auto" }}>
      <Table size="small" stickyHeader aria-label="sticky table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, width: 80, bgcolor: 'action.hover' }}>No</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover' }}>Reader Name</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, width: 120, bgcolor: 'action.hover' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {readers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">
                  No readers registered for this brand.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            readers.map((reader, i) => (
              <TableRow key={reader.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{reader.name}</TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                    <AddEditBleReader type="edit" bleReader={reader} fixedBrandId={reader.brandId} />
                    <Tooltip title="View Reader" arrow>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => {
                          dispatch(SelectBleReader(reader.id));
                          navigate('/master/blereader', { state: { readerName: reader.name } });
                        }}
                      >
                        <IconExternalLink size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Reader" arrow>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onDeleteClick(reader)}
                      >
                        <IconTrash size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const BrandAccordionContent = ({
  readers,
  brandId,
  onDeleteClick,
}: {
  readers: bleReaderType[];
  brandId: string;
  onDeleteClick: (reader: bleReaderType) => void;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', my: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          BLE Readers
        </Typography>
        <AddEditBleReader
          type="add"
          fixedBrandId={brandId}
          trigger={(onClick) => (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<IconPlus size={16} />}
              onClick={onClick}
            >
              Add Reader
            </Button>
          )}
        />
      </Box>
      <ReaderTable readers={readers} onDeleteClick={onDeleteClick} />
    </Paper>
  );
};

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
  
  const {data: readerData = [], isLoading: readerLoading} = useAllReaders();

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

  const isChildShown = useSelector((state: RootState) => state.customizer.isChildShown);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);

  const toggleExpand = (brandId: string) => {
    console.log("readers", readerData)
    setExpandedBrandId((prev) => (prev === brandId ? null : brandId));
  };

  // Delete Reader Dialog State
  const [deleteReaderDialogOpen, setDeleteReaderDialogOpen] = useState(false);
  const [selectedReader, setSelectedReader] = useState<bleReaderType | null>(null);
  const deleteReaderMutation = useDeleteReader();

  const handleOpenDeleteReaderDialog = (reader: bleReaderType) => {
    setSelectedReader(reader);
    setDeleteReaderDialogOpen(true);
  };

  const handleCloseDeleteReaderDialog = () => {
    setDeleteReaderDialogOpen(false);
    setSelectedReader(null);
  };

  const handleConfirmDeleteReader = async () => {
    if (selectedReader) {
      try {
        await deleteReaderMutation.mutateAsync(selectedReader.id);
        toast.success('Reader deleted successfully');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteReaderDialog();
  };

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
              backgroundColor: 'background.paper',
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
              backgroundColor: 'background.paper',
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
                        backgroundColor: 'background.paper',
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
                        backgroundColor: 'background.paper',
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
                  : brandData.map((brand, index) => {
                      const isOpen = expandedBrandId === brand.id;
                      const brandReaders = (readerData || []).filter(
                        (r) => r.brand?.id?.toLowerCase() === brand.id?.toLowerCase(),
                      );
                      return (
                        <React.Fragment key={brand.id || index}>
                          <TableRow hover>
                            <TableCell
                              sx={{
                                position: 'sticky',
                                left: 0,
                                backgroundColor: 'background.paper',
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
                                backgroundColor: 'background.paper',
                                zIndex: 1,
                                width: 150, // Fixed width
                                minWidth: 150,
                                maxWidth: 150,
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={1}>
                                <AddEditBrand type="edit" brand={brand} />
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleOpenDeleteDialog(brand)}
                                >
                                  <IconTrash size={20} />
                                </IconButton>
                                {isChildShown && (
                                  <Tooltip title={isOpen ? 'Hide Readers' : 'Show Readers'} arrow>
                                    <IconButton size="small" onClick={() => toggleExpand(brand.id)}>
                                      {isOpen ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                          {/* ACCORDION ROW */}
                          {isChildShown && (
                            <TableRow>
                              <TableCell colSpan={4} sx={{ p: 0, borderBottom: 0 }}>
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                  <Box pl={6} pr={2} pb={2}>
                                    <BrandAccordionContent
                                      readers={brandReaders}
                                      brandId={brand.id}
                                      onDeleteClick={handleOpenDeleteReaderDialog}
                                    />
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
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
          <Button
            onClick={handleConfirmDelete}
            color={deleteMutation.isPending ? 'primary' : 'error'}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Reader Confirmation Dialog */}
      <Dialog open={deleteReaderDialogOpen} onClose={handleCloseDeleteReaderDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the BLE reader <strong>{selectedReader?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteReaderDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteReader}
            color={deleteReaderMutation.isPending ? 'primary' : 'error'}
            disabled={deleteReaderMutation.isPending}
            startIcon={deleteReaderMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteReaderMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};
export default BrandList;
