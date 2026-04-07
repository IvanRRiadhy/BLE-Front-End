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
  CircularProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IconChevronDown,
  IconChevronRight,
  IconEye,
  IconInfoCircle,
  IconInfoHexagon,
  IconQuestionMark,
  IconSettings,
  IconTrash,
  IconUserCheck,
} from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  PatrolAssignType,
  PatrolRouteType,
  SelectPatrolAssign,
  SelectPatrolRoute,
  UpdateFilter,
} from 'src/store/apps/crud/patrolRoute';

// import AddEditPatrolRoute from './AddEditPatrolRoute';
import toast from 'react-hot-toast';
import {
  useDeletePatrolAssign,
  useDeletePatrolRoute,
  usePatrolAssignmentByRoute,
  usePatrolRouteList,
} from 'src/hooks/usePatrolRoute';
import AddEditPatrolRoute from './AddEditPatrolRoute';
import AssignPatrol from './AssignPatrol';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const columns = [
  // { label: '', field: 'expand', sortAble: false },
  { label: 'Route Name', field: 'Name', sortAble: true },
  { label: 'Description', field: 'Description', sortAble: false },
  { label: 'Patrol Area Count', field: 'PatrolAreaIds.Length', sortAble: false },
  { label: 'Patrol Start', field: '', sortAble: false },
  { label: 'Patrol End', field: '', sortAble: false },
];

const SKELETON_ROWS = 5;

const PatrolRouteList = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const patrolRouteFilter = useSelector(
    (state: RootState) => state.PatrolRouteReducer.patrolRouteFilter,
  );
  const patrolAssignmentFilter = useSelector(
    (state: RootState) => state.PatrolRouteReducer.patrolAssignFilter,
  );
  const { data, isLoading: queryLoading } = usePatrolRouteList(patrolRouteFilter);
  const patrolRouteData = data?.data || [];
  const patrolRouteTotalCount = data?.recordsTotal || 0;
  const patrolRouteFilteredCount = data?.recordsFiltered || 0;
  const isLoading = useSelector((state: RootState) => state.PatrolRouteReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.PatrolRouteReducer.hasLoaded);

  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setOpenRowId((prev) => (prev === id ? null : id));
  };

  //Pagination State
  const page = Math.floor(patrolRouteFilter.start / patrolRouteFilter.length);
  const rowsPerPage = patrolRouteFilter.length;
  const orderBy = patrolRouteFilter.sortColumn;
  const order = patrolRouteFilter.sortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ start: newPage * patrolRouteFilter.length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ length: newLength, start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = patrolRouteFilter.sortColumn === column && patrolRouteFilter.sortDir === 'asc';
    const isDesc = patrolRouteFilter.sortColumn === column && patrolRouteFilter.sortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          sortColumn: 'name',
          sortDir: 'asc',
          start: 0,
        }),
      );
    } else {
      dispatch(
        UpdateFilter({
          sortColumn: column,
          sortDir: isAsc ? 'desc' : 'asc',
          start: 0,
        }),
      );
    }
  };

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPatrolRoute, setSelectedPatrolRoute] = useState<PatrolRouteType | null>(null);
  const deleteMutation = useDeletePatrolRoute();
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ca: PatrolRouteType) => {
    setSelectedPatrolRoute(ca);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedPatrolRoute(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedPatrolRoute) {
      try {
        await deleteMutation.mutateAsync(selectedPatrolRoute.id);
        toast.success('Data Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteDialog();
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
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
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={160} height={22} />
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

  //Patrol Assign

  const [deleteAssignmentDialog, setDeleteAssignmentDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PatrolAssignType | null>(null);
  const deleteAssignmentMutation = useDeletePatrolAssign();

  const handleDeleteAssignment = (assign: PatrolAssignType) => {
    setSelectedAssignment(assign);
    setDeleteAssignmentDialog(true);
  };
  const handleCloseDeleteDialogAssignment = () => {
    setDeleteAssignmentDialog(false);
    setSelectedAssignment(null);
  };
  const handleConfirmDeleteAssignment = async () => {
    if (selectedAssignment) {
      try {
        await deleteAssignmentMutation.mutateAsync(selectedAssignment.id);
        toast.success('Patrol Assignment Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteDialogAssignment();
  };

  const handleAssignmentSetting = (route: PatrolRouteType, assign?: PatrolAssignType) => {
    if (assign) {
      dispatch(SelectPatrolAssign(assign));
    }

    dispatch(SelectPatrolRoute(route));
    navigate(`/master/patrolassignment/edit`);
  };

  const PatrolAssignmentAccordionRow = ({ routeId }: { routeId: string }) => {
    const { data, isLoading } = usePatrolAssignmentByRoute(routeId, patrolAssignmentFilter);

    if (isLoading) {
      return (
        <Box p={2}>
          <Skeleton height={40} />
        </Box>
      );
    }

    if (!data?.length) {
      return (
        <Box p={2}>
          <Typography variant="body2" color="text.secondary">
            No patrol assignment
          </Typography>
        </Box>
      );
    }

    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Assignment Name</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell>Security Count</TableCell>
            {/* Action Column */}
            <TableCell
              sx={{
                position: 'sticky',
                right: 0,
                background: 'gray.50',
                zIndex: 2,
                width: 120,
                minWidth: 120,
              }}
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((assign) => (
            <TableRow key={assign.id}>
              <TableCell>{assign.name}</TableCell>
              <TableCell>{formatTime(assign.startDate)}</TableCell>
              <TableCell>{formatTime(assign.endDate)}</TableCell>
              <TableCell>
                {assign.securities?.length}
                {
                  <Tooltip
                    title={assign.securities
                      ?.map((security: { name: string }) => security.name)
                      ?.join(', ')}
                  >
                    <IconButton size="small">
                      <IconEye size={18} />
                    </IconButton>
                  </Tooltip>
                }
              </TableCell>

              {/* ACTION */}
              <TableCell
                sx={{
                  position: 'sticky',
                  right: 0,
                  background: 'gray.50',
                  zIndex: 1,
                }}
              >
                {/* <AssignPatrol
                  type="edit"
                  patrolRouteId={assign.patrolRouteId}
                  patrolAssign={assign}
                /> */}
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => handleAssignmentSetting(assign.patrolRoute!, assign)}
                >
                  <IconSettings size={18} />
                </IconButton>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleDeleteAssignment(assign)}
                >
                  <IconTrash size={18} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
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
                      <Typography variant="h6">#</Typography>
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
                    : patrolRouteData.map((patrolRoute: PatrolRouteType, index: number) => {
                        const isOpen = openRowId === patrolRoute.id;
                        return (
                          <React.Fragment key={patrolRoute.id}>
                            {/* MAIN ROW */}
                            <TableRow hover>
                              <TableCell width={40}>
                                <Tooltip title={isOpen ? 'Hide Assignments' : 'Show Assignments'}>
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRow(patrolRoute.id)}
                                  >
                                    {isOpen ? <IconChevronDown /> : <IconChevronRight />}
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{patrolRoute.name}</TableCell>
                              <TableCell>{patrolRoute.description}</TableCell>
                              <TableCell>{patrolRoute.patrolAreas?.length ?? 0}</TableCell>
                              <TableCell>{patrolRoute.startAreaName ?? '-'}</TableCell>
                              <TableCell>{patrolRoute.endAreaName ?? '-'}</TableCell>
                              <TableCell
                                sx={{
                                  position: 'sticky',
                                  right: 0,
                                  background: 'white',
                                }}
                              >
                                <AddEditPatrolRoute patrolRoute={patrolRoute} type="edit" />
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleAssignmentSetting(patrolRoute)}
                                >
                                  <IconUserCheck size={18} />
                                </IconButton>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleOpenDeleteDialog(patrolRoute)}
                                >
                                  <IconTrash size={20} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            {/* ACCORDION ROW */}
                            <TableRow>
                              <TableCell
                                colSpan={columns.length + 2}
                                sx={{ p: 0, borderBottom: 0 }}
                              >
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                  <Box p={2} bgcolor="grey.200" pl={8}>
                                    <PatrolAssignmentAccordionRow routeId={patrolRoute.id} />
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={patrolRouteFilteredCount}
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
            Are you sure you want to delete the patrol route{' '}
            <strong>{selectedPatrolRoute?.name}</strong>?
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

      {/* Assignment Delete Confirmation Dialog */}
      <Dialog open={deleteAssignmentDialog} onClose={handleCloseDeleteDialogAssignment}>
        <DialogTitle>Confirm Assignment Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the patrol assignment{' '}
            <strong>{selectedPatrolRoute?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialogAssignment} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteAssignment}
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

export default PatrolRouteList;
