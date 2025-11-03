import React, { lazy, useEffect, useRef, useState } from 'react';
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
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  FloorplanType,
  UpdateFilter,
  deleteFloorplan,
  fetchFloorplanDT,
} from 'src/store/apps/crud/floorplan';
// import { useTranslation } from 'react-i18next';
import { defaultFloorplanFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { BASE_URL } from 'src/utils/axios';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchEngines } from 'src/store/apps/crud/engine';
const columns = [
  { label: 'Floorplan Name', field: 'Name', sortAble: true },
  { label: 'Floor Name', field: 'Floor.Name', sortAble: true },
  { label: 'Building Name', field: '', sortAble: false },
  { label: 'Floorplan Image', field: '', sortAble: false },
  { label: 'Floorplan Dimension (meter)', field: '', sortAble: false },
  { label: 'Engine', field: 'Engine.Name', sortAble: true },
];
const AddEditFloorplan = lazy(() => import('./AddEditFloorplan'));

const SKELETON_ROWS = 5;

const FloorplanList = () => {
  const dispatch: AppDispatch = useDispatch();
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );
  const floorplanTotalCount = useSelector(
    (state: RootState) => state.floorplanReducer.floorplanTotalCount,
  );
  // const floorplanFilteredCount = useSelector(
  //   (state: RootState) => state.floorplanReducer.floorplanFilteredCount,
  // );
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  const prevFilterRef = useRef(floorplanFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isLoading = useSelector((state: RootState) => state.floorplanReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.floorplanReducer.hasLoaded);
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
    const isDesc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === 'desc';

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

  // useEffect(() => {
  //   console.log("Floorplan Data:", floorplanData);
  // }, [floorplanData]);

  useEffect(() => {
    dispatch(UpdateFilter(defaultFloorplanFilter));
    setLoading(true);

    Promise.all([
      dispatch(fetchFloorplanDT(defaultFloorplanFilter)).finally(() => {
        requestIdleCallback(() => {
          dispatch(fetchEngines());
        });
      }),
      dispatch(fetchBuildings()),
      dispatch(fetchFloors()),
    ]).finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartorLengthChanged =
      prevFilter.Start !== floorplanFilter.Start || prevFilter.Length !== floorplanFilter.Length;
    if (isStartorLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchFloorplanDT(floorplanFilter)).finally(() => {
      if (isStartorLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    console.log('floorplan: ', floorplanData);
    prevFilterRef.current = floorplanFilter;
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
  const handleConfirmDelete = async () => {
    if (selectedFloorplan) {
      setLoading(true);
      try {
        const result = await dispatch(deleteFloorplan(selectedFloorplan.id));
        if (result && result.type && result.type.endsWith('/fulfilled')) {
          await dispatch(fetchFloorplanDT(floorplanFilter));
          toast.success('Data Deleted');
        }
      } catch (error) {
        toast.error('Delete Data Unsuccessful');
        console.error('Error deleting floorplan:', error);
      }
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
    handleCloseDeleteDialog();
  };
  const getbuildingName = (buildingId: string) => {
    const building = buildingData.find((b) => b.id === buildingId);
    return building ? building.name : 'Unknown Building';
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
          <TableCell>
            <Skeleton variant="rectangular" width={80} height={60} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={140} height={22} />
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
                  {!hasLoaded
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : floorplanData.map((floorplan: FloorplanType, index: number) => (
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
                          <TableCell>{floorplan.name}</TableCell>
                          <TableCell>{floorplan.floor?.name}</TableCell>
                          <TableCell>
                            {' '}
                            {getbuildingName(floorplan.floor?.buildingId || '')}
                          </TableCell>
                          <TableCell>
                            {floorplan.floorplanImage ? (
                              <img
                                src={`${BASE_URL}${floorplan.floorplanImage}`}
                                alt="Floor"
                                loading='lazy'
                                style={{ width: 80, height: 80, objectFit: 'cover' }}
                              />
                            ) : (
                              'No Image'
                            )}
                          </TableCell>
                          <TableCell>{`(${floorplan.floorX}, ${floorplan.floorY})`}</TableCell>

                          <TableCell>{floorplan.engine?.name}</TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              background: 'white',
                              zIndex: 2,
                              gap: 1,
                              alignItems: 'center',
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
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
              count={floorplanTotalCount}
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

export default FloorplanList;
