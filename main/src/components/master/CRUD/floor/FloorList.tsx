import { BASE_URL } from 'src/utils/axios';
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
  DialogContentText,
  DialogActions,
  Button,
  TableSortLabel,
  Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { deleteFloor, fetchFloorDT, floorType, UpdateFilter } from 'src/store/apps/crud/floor';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import AddEditFloor from './AddEditFloor';
import { defaultFloorFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Building Name', field: 'Building.Name', sortAble: true },
  { label: 'Floor Name', field: 'Name', sortAble: true },
  { label: 'Floor Image', field: '', sortAble: false },
  { label: 'Floor Dimension (meter)', field: '', sortAble: false },
  { label: 'Engine Floor', field: 'EngineFloorId', sortAble: true },
];

const SKELETON_ROWS = 5;

const FloorList = () => {
  const dispatch: AppDispatch = useDispatch();
  const floorData = useSelector((state: RootState) => state.floorReducer.floors);
  const floorTotalCount = useSelector((state: RootState) => state.floorReducer.floorTotalCount);
  // const floorFilteredCount = useSelector(
  //   (state: RootState) => state.floorReducer.floorFilteredCount,
  // );
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  const prevFilterRef = useRef(floorFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const hasLoaded = useSelector((state: RootState) => state.floorReducer.hasLoaded);
  // Pagination State
  const page = Math.floor(floorFilter.Start / floorFilter.Length);
  const rowsPerPage = floorFilter.Length;
  const orderBy = floorFilter.SortColumn;
  const order = floorFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * floorFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = floorFilter.SortColumn === column && floorFilter.SortDir === 'asc';
    const isDesc = floorFilter.SortColumn === column && floorFilter.SortDir === 'desc';

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
    dispatch(fetchBuildings());
    dispatch(UpdateFilter(defaultFloorFilter));
    try {
      setLoading(true);
      dispatch(fetchFloorDT(defaultFloorFilter));
    } catch (error) {
      console.log(error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartOrLengthChanged =
      prevFilter.Start !== floorFilter.Start || prevFilter.Length !== floorFilter.Length;
    if (isStartOrLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchFloorDT(floorFilter)).finally(() => {
      if (isStartOrLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    prevFilterRef.current = floorFilter;
  }, [floorFilter, dispatch]);

  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<floorType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (floor: floorType) => {
    setSelectedFloor(floor);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedFloor(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedFloor) {
      setLoading(true);
      try {
        const result = await dispatch(deleteFloor(selectedFloor.id));
        if (result && result.type && result.type.endsWith('/fulfilled')) {
          await dispatch(fetchFloorDT(floorFilter));
          toast.success('Data Deleted');
        }
      } catch (error) {
        toast.error('Delete Data Unsuccessful');
        console.error('Error deleting floor:', error);
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
            <Skeleton variant="text" width={160} height={22} />
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
                  {!hasLoaded
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : floorData.map((floor: floorType, index: number) => (
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
                          <TableCell>{floor.building?.name}</TableCell>
                          <TableCell>{floor.name}</TableCell>
                          <TableCell>
                            {floor.floorImage ? (
                              <img
                                src={`${BASE_URL}${floor.floorImage}`}
                                alt="Floor"
                                style={{ width: 80, height: 80, objectFit: 'cover' }}
                              />
                            ) : (
                              'No Image'
                            )}
                          </TableCell>
                          <TableCell>{`(${floor.floorX}, ${floor.floorY})`}</TableCell>
                          <TableCell>{floor.engineFloorId}</TableCell>
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
                            <AddEditFloor type="edit" floor={floor} />
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleOpenDeleteDialog(floor)}
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
              count={floorTotalCount}
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
            Are you sure you want to delete the floor <strong>{selectedFloor?.name}</strong>?
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

export default FloorList;
