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
  Skeleton,
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  CCTVType,
  deleteCCTV,
  fetchAccessCCTVDT,
  UpdateFilter,
} from 'src/store/apps/crud/accessCCTV';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import AddEditAccessCCTV from './AddEditAccessCCTV';
import { defaultAccessCCTVFilter } from 'src/store/apps/defaultForm';
import { useCCTVList, useDeleteCCTV } from 'src/hooks/useCCTV';
import toast from 'react-hot-toast';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'RTSP', field: 'Rtsp', sortAble: false },
];

const SKELETON_ROWS = 5;

const AccessCCTVList = () => {
  const dispatch: AppDispatch = useDispatch();
  // const CCTVData: CCTVType[] = useSelector((state: RootState) => state.CCTVReducer.cctvs);
  // const CCTVTotalCount = useSelector((state: RootState) => state.CCTVReducer.cctvTotalCount);
  // const CCTVFilteredCount = useSelector((state: RootState) => state.CCTVReducer.cctvFilteredCount);
  const CCTVFilter = useSelector((state: RootState) => state.CCTVReducer.cctvFilter);
  const { data, isLoading: queryLoading } = useCCTVList(CCTVFilter);
  const CCTVData = data?.data || [];
  const CCTVTotalCount = data?.recordsTotal || 0;
  const CCTVFilteredCount = data?.recordsFiltered || 0;
  const isLoading = useSelector((state: RootState) => state.CCTVReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.CCTVReducer.hasLoaded);
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(CCTVFilter.Start / CCTVFilter.Length);
  const rowsPerPage = CCTVFilter.Length;
  const orderBy = CCTVFilter.SortColumn;
  const order = CCTVFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * CCTVFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  useEffect(() => {
    dispatch(UpdateFilter(defaultAccessCCTVFilter));
    try {
      dispatch(fetchAccessCCTVDT(CCTVFilter));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    try {
      dispatch(fetchAccessCCTVDT(CCTVFilter));
    } catch (error) {
      console.error('Error fetching data:', error);
    }

    // dispatch(UpdateFilter(defaultAccessCCTVFilter));
  }, [CCTVFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVType | null>(null);
  const deleteMutation = useDeleteCCTV();
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

  const handleConfirmDelete = async () => {
    if (selectedCCTV) {
      // dispatch(deleteCCTV(selectedCCTV.id));
      try {
        await deleteMutation.mutateAsync(selectedCCTV.id);
        toast.success('Data Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteDialog();
  };

  const handleSort = (column: string) => {
    const isAsc = CCTVFilter.SortColumn === column && CCTVFilter.SortDir === 'asc';
    const isDesc = CCTVFilter.SortColumn === column && CCTVFilter.SortDir === 'desc';

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
            <Skeleton variant="text" width={160} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={22} />
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
                      <Typography variant="h6"> </Typography>
                    </TableCell>
                    {/* Main Table Header */}
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
                    : CCTVData.map((cctv, index) => (
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
                          <TableCell>{cctv.name}</TableCell>
                          <TableCell>{cctv.rtsp}</TableCell>
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
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Pagination */}
            <TablePagination
              component="div"
              count={CCTVFilteredCount}
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
            Are you sure you want to delete the Access CCTV <strong>{selectedCCTV?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color={isLoading ? 'primary' : 'error'}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default AccessCCTVList;
