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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconEye, IconTrash, IconEdit } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { SelectFloorplan, UpdateFilter } from 'src/store/apps/crud/floorplan';
import { useNavigate } from 'react-router';
import { defaultFloorplanFilter } from 'src/store/apps/defaultForm';

import { useAllBuilding } from 'src/hooks/useBuilding';
import { useFloorplanList } from 'src/hooks/useFloorplan';
import FloorplanPreviewDialog from '../maskedArea/FloorplanPreviewDialog';
import { FloorplanType } from 'src/store/apps/crud/floorplan';
import { BuildingType } from 'src/store/apps/crud/building';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { useAllFloorplanDevices } from 'src/hooks/useFloorplanDevice';

const columns = [
  { label: 'Building', field: 'Floor.Name', sortAble: true },
  { label: 'Floor', field: 'Floor.Name', sortAble: true },
  { label: 'Floorplan', field: 'Name', sortAble: true },
  { label: 'Total Device', field: 'DeviceCount', sortAble: true },
];

const SKELETON_ROWS = 5;

const FloorplanDeviceList2 = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  // Filter comes from Redux (unchanged)
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  // ⬇️ Replace Redux fetch with React Query hooks
  const buildingData: BuildingType[] = useAllBuilding().data || [];
  const deviceData: FloorplanDeviceType[] = useAllFloorplanDevices().data || [];
  const { data, isLoading: queryLoading } = useFloorplanList(floorplanFilter);

  const floorplanData = data?.data || [];
  const floorplanTotalCount = data?.recordsTotal || 0;
  const floorplanFilteredCount = data?.recordsFiltered || 0;

  // Pagination
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
    const isAsc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === "asc";
    const isDesc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === "desc";

    if (isDesc) {
      dispatch(UpdateFilter({ SortColumn: "UpdatedAt", SortDir: "desc", Start: 0 }));
    } else {
      dispatch(UpdateFilter({ SortColumn: column, SortDir: isAsc ? "desc" : "asc", Start: 0 }));
    }
  };

  // Reset filter on mount (same behavior as before)
  useEffect(() => {
    dispatch(UpdateFilter(defaultFloorplanFilter));
  }, []);

  // useEffect(() => {
  //   dispatch(GetAllFloorplanDevices(deviceData));
  //   console.log("Floorplan Devices Data:", deviceData);
  // }, [deviceData]);

  // Delete Confirmation Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<FloorplanType | null>(null);

  const handleOpenDeleteDialog = (device: FloorplanType) => {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedDevice(null);
  };

  const handleConfirmDelete = () => {
    if (selectedDevice) {
      console.log("Device to be deleted:", selectedDevice);
      setDeleteDialogOpen(false);
    }
  };

  // On row click → open editor
  const handleOnClick = (floorplanToEdit: FloorplanType) => {
    dispatch(SelectFloorplan(floorplanToEdit));
    navigate('/master/device/edit');
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildingData.find((b) => b.id === buildingId);
    return building ? building.name : "Unknown Building";
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell><Skeleton width={180} height={22} /></TableCell>
          <TableCell><Skeleton width={160} height={22} /></TableCell>
          <TableCell><Skeleton width={160} height={22} /></TableCell>
          <TableCell><Skeleton width={160} height={22} /></TableCell>
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              background: 'white',
              width: 150,
              zIndex: 2,
            }}
          >
            <Skeleton width={90} height={32} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  // Preview floorplan
  const [previewFloorplanId, setPreviewFloorplanId] = useState<string | null>(null);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          <BlankCard>
            <TableContainer  sx={{
              maxHeight: '55vh',
            }}>
              <Table stickyHeader sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.label}>
                        {col.sortAble ? (
                          <TableSortLabel
                            active={orderBy === col.field}
                            direction={orderBy === col.field ? order : "asc"}
                            onClick={() => handleSort(col.field)}
                          >
                            <Typography variant="h6">{col.label}</Typography>
                          </TableSortLabel>
                        ) : (
                          <Typography variant="h6">{col.label}</Typography>
                        )}
                      </TableCell>
                    ))}

                    {/* ACTIONS */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        background: 'background.paper',
                        width: 150,
                        minWidth: 150,
                        maxWidth: 150,
                        zIndex: 2,
                      }}
                    >
                      <Typography variant="h6">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {queryLoading
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : floorplanData.map((floorplan: FloorplanType, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ position: 'sticky', left: 0, background: 'background.paper', zIndex: 1 }}>
                            {getBuildingName(floorplan.floor?.buildingId || "")}
                          </TableCell>

                          <TableCell>{floorplan.floor?.name}</TableCell>

                          <TableCell>
                            {floorplan.name}
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => setPreviewFloorplanId(floorplan.id)}
                            >
                              <IconEye size={20} />
                            </IconButton>
                          </TableCell>

                          <TableCell>{floorplan.deviceCount}</TableCell>

                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              background: 'background.paper',
                              width: 150,
                              zIndex: 1,
                            }}
                          >
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleOnClick(floorplan)}
                            >
                              <IconEdit size={20} />
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
              count={floorplanFilteredCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {previewFloorplanId && (
              <FloorplanPreviewDialog
                floorplanId={previewFloorplanId}
                onClose={() => setPreviewFloorplanId(null)}
              />
            )}
          </BlankCard>
        </Box>
      </Grid>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{selectedDevice?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default FloorplanDeviceList2;
