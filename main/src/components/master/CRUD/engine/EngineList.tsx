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
  DialogContentText,
  DialogContent,
  DialogActions,
  Button,
  TableSortLabel,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import {
  EngineType,
  SetEngineFilter,

} from 'src/store/apps/crud/engine';
import { defaultEngineFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useAllEngines, useDeleteEngine, useEngineList } from 'src/hooks/useEngine';
import AssignReaderDialog from './AssignReaderDialog';
// import { useTranslation } from 'react-i18next';

const columns = [
//   { label: 'Engine Code', field: '', sortAble: false },
  { label: 'Engine Name', field: 'Name', sortAble: true },
  { label: 'Engine Port', field: 'port', sortAble: true },
  { label: 'Service Status', field: 'serviceStatus', sortAble: true },
  { label: 'Last Lived Time', field: 'lastLive', sortAble: true},
];

const SKELETON_ROWS = 5;

const EngineList = () => {
  const dispatch: AppDispatch = useDispatch();
  // const districtData: EngineType[] = useSelector(
  //   (state: RootState) => state.districtReducer.districts,
  // );
  // const districtTotalCount = useSelector((state: RootState) => state.districtReducer.districtTotalCount);
  // const districtFilteredCount = useSelector(
  //   (state: RootState) => state.districtReducer.districtFilteredCount,
  // );
  const engineFilter = useSelector((state: RootState) => state.EngineReducer.engineFilter);
  const { data, isLoading: queryLoading } = useEngineList(defaultEngineFilter);
//   const engineData = data?.data || [];
const engineResponse = useAllEngines();
const engineData = engineResponse.data || [];
  const engineTotalCount = data?.recordsTotal || 0;
  const engineFilteredCount = data?.recordsFiltered || 0;
  const prevFilterRef = useRef(engineFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Pagination State
  const page = Math.floor(engineFilter.Start / engineFilter.Length);
  const rowsPerPage = engineFilter.Length;
  const orderBy = engineFilter.SortColumn;
  const order = engineFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(SetEngineFilter({ Start: newPage * engineFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(SetEngineFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = engineFilter.SortColumn === column && engineFilter.SortDir === 'asc';
    const isDesc = engineFilter.SortColumn === column && engineFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        SetEngineFilter({
          SortColumn: 'UpdatedAt',
          SortDir: 'desc',
          Start: 0,
        }),
      );
    } else {
      dispatch(
        SetEngineFilter({
          SortColumn: column,
          SortDir: isAsc ? 'desc' : 'asc',
          Start: 0,
        }),
      );
    }
  };

  // useEffect(() => {
  //   dispatch(SetEngineFilter(defaultDistrictFilter));
  //   try {
  //     setLoading(true);
  //     dispatch(fetchDistrictDT(defaultDistrictFilter));
  //   } catch (error) {
  //     console.error('Error fetching engine data:', error);
  //   }
  //   setTimeout(() => {
  //     setLoading(false);
  //   }, 500);
  // }, [dispatch]);

  // useEffect(() => {
  //   const prevFilter = prevFilterRef.current;
  //   const isStartorLengthChanged =
  //     prevFilter.Start !== engineFilter.Start || prevFilter.Length !== engineFilter.Length;
  //   if (isStartorLengthChanged) {
  //     setLoading(true);
  //   }
  //   dispatch(fetchDistrictDT(engineFilter)).finally(() => {
  //     if (isStartorLengthChanged) {
  //       setTimeout(() => {
  //         setLoading(false);
  //       }, 500);
  //     }
  //   });
  //   prevFilterRef.current = engineFilter;
  // }, [engineFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<EngineType | null>(null);
  const deleteMutation = useDeleteEngine();
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (dist: EngineType) => {
    setSelectedEngine(dist);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedEngine(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedEngine) {
      setLoading(true);
      // try {
      //   const result = await dispatch(deleteDistrict(selectedEngine.id));
      //   if (result && result.type && result.type.endsWith('/fulfilled')) {
      //     await dispatch(fetchDistrictDT(engineFilter));
      //     toast.success('Data Deleted');
      //   }
      // } catch (error) {
      //   toast.error('Delete Data Unsuccessful');
      //   console.error('Error deleting engine:', error);
      // }
      try {
        await deleteMutation.mutateAsync(selectedEngine.id);
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
            <Skeleton variant="text" width={160} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={22} />
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
            <TableContainer
              sx={{
                maxHeight: '55vh',
              }}
            >
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
                    {columns.map((col, idx: number) => (
                      <TableCell key={`${col.label}-${idx}`}>
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
                <TableBody key={'skeleton-body'}>
                  {queryLoading
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : engineData.map((engine, index) => (
                        <TableRow key={engine.id}>
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
                          <TableCell>{engine.name}</TableCell>
                          <TableCell>{engine.port}</TableCell>
                          <TableCell>{engine.serviceStatus}</TableCell>
                          <TableCell>{engine.lastLive}</TableCell>

                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              display: 'flex',
                              gap: 1,
                              alignItems: 'center',
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            {/* <AddEditDistrict type="edit" engine={engine} /> */}
                            <AssignReaderDialog engine={engine} />
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleOpenDeleteDialog(engine)}
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
              count={engineFilteredCount}
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
            Are you sure you want to delete the distric <strong>{selectedEngine?.name}</strong>?
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
    </Grid>
  );
};
export default EngineList;
