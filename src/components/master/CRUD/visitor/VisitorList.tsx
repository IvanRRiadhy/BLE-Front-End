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
  CircularProgress,
  TableSortLabel,
  Skeleton,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconCircleCheck, IconForbid, IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { useTranslation } from 'react-i18next';
import {
  deleteVisitor,
  fetchVisitorDT,
  UpdateFilter,
  VisitorType,
} from 'src/store/apps/crud/visitor';
import AddEditVisitor from './AddEditVisitor';
import { defaultVisitorFilter } from 'src/store/apps/defaultForm';
import { useBlacklistVisitor, useUnBlacklistVisitor, useVisitorList } from 'src/hooks/useVisitor';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import toast from 'react-hot-toast';

const columns = [
  { label: 'Visitor Name', field: 'Name', sortAble: true },
  { label: 'Person ID', field: 'PersonId', sortAble: true },
  { label: 'Identity Id', field: 'IdentityId', sortAble: true },
  { label: 'Card Number', field: 'CardNumber', sortAble: true },
  { label: 'BLE Card Number', field: 'BleCardNumber', sortAble: true },
  { label: 'Phone Number', field: 'phone', sortAble: false },
  { label: 'Email', field: 'Email', sortAble: false },
  { label: 'Gender', field: 'Gender', sortAble: false },
  { label: 'Address', field: 'Address', sortAble: false },
  { label: 'Blacklisted', field: 'IsBlacklist', sortAble: false },
];

const VisitorList = () => {
  const dispatch: AppDispatch = useDispatch();
  // const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
  // const visitorTotalCount = useSelector(
  //   (state: RootState) => state.visitorReducer.visitorTotalCount,
  // );
  // const visitorFilteredCount = useSelector(
  //   (state: RootState) => state.visitorReducer.visitorFilteredCount,
  // );
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const prevFilterRef = useRef(visitorFilter);
  // const { t } = useTranslation();
  const { data, isLoading: queryLoading } = useVisitorList(visitorFilter);
  const [loading, setLoading] = useState(false);
  const isLoading = useSelector((state: RootState) => state.visitorReducer.isLoading);
  const visitorData = data?.data ?? [];
  const visitorTotalCount = data?.recordsTotal ?? 0;
  const visitorFilteredCount = data?.recordsFiltered ?? 0;
  // Pagination State
  const page = Math.floor(visitorFilter.Start / visitorFilter.Length);
  const rowsPerPage = visitorFilter.Length;
  const orderBy = visitorFilter.SortColumn;
  const order = visitorFilter.SortDir;
  // Handle page change
  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * visitorFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = visitorFilter.SortColumn === column && visitorFilter.SortDir === 'asc';
    const isDesc = visitorFilter.SortColumn === column && visitorFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'UpdatedAt',
          SortDir: 'asc',
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
  //   dispatch(UpdateFilter(defaultVisitorFilter));
  //   try {
  //     dispatch(fetchVisitorDT(defaultVisitorFilter));
  //   } catch (error) {
  //     console.error('Error fetching organization data:', error);
  //   }
  // }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartorLengthChanged =
      prevFilter.Start !== visitorFilter.Start || prevFilter.Length !== visitorFilter.Length;
    if (isStartorLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchVisitorDT(visitorFilter)).finally(() => {
      if (isStartorLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    prevFilterRef.current = visitorFilter;
  }, [visitorFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (vis: VisitorType) => {
    setSelectedVisitor(vis);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedVisitor(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedVisitor) {
      dispatch(deleteVisitor(selectedVisitor.id));
    }
    handleCloseDeleteDialog();
  };

  //Blacklist Popup
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [selectedBList, setSelectedBList] = useState<VisitorType | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const blacklistMutation = useBlacklistVisitor();
  // Open delete confirmation dialog
  const handleOpenBlacklistDialog = (vis: VisitorType) => {
    setSelectedBList(vis);
    setBlacklistDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseBlacklistDialog = () => {
    setBlacklistDialogOpen(false);
    setSelectedBList(null);
  };

  // Confirm delete action
  const handleConfirmBlacklist = async () => {
    // if (selectedBList) {
    //   dispatch(blacklistVisitor(selectedBList.id));
    // }
    if (selectedBList && blacklistReason) {
      try {
        await blacklistMutation.mutateAsync({
          visitorId: selectedBList.id,
          BlacklistReason: blacklistReason,
        });
        toast.success('Visitor has been Blacklisted');
      } catch (error) {
        toast.error('Failed to blacklist visitor');
        console.error(error);
      }
    }
    handleCloseBlacklistDialog();
  };

  //UnBlacklist Popup
  const [unblacklistDialogOpen, setUnblacklistDialogOpen] = useState(false);
  const [selectedUList, setSelectedUList] = useState<VisitorType | null>(null);
  const unblacklistMutation = useUnBlacklistVisitor();
  // Open delete confirmation dialog
  const handleOpenUnblacklistDialog = (vis: VisitorType) => {
    setSelectedUList(vis);
    setUnblacklistDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseUnblacklistDialog = () => {
    setUnblacklistDialogOpen(false);
    setSelectedUList(null);
  };

  // Confirm delete action
  const handleConfirmUnblacklist = async () => {
    // if (selectedBList) {
    //   dispatch(blacklistVisitor(selectedBList.id));
    // }
    if (selectedUList) {
      try {
        await unblacklistMutation.mutateAsync(selectedUList.id);
        toast.success('Visitor has been Unblacklisted');
      } catch (error) {
        toast.error('Failed to unblacklist visitor');
        console.error(error);
      }
    }
    handleCloseUnblacklistDialog();
  };

  //TABLE LAYOUT

  const ellipsisSx = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const renderSkeletonRows = (rows: number) =>
    Array.from({ length: rows }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
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
          <Skeleton variant="rounded" width={30} height={32} />
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
        <TableCell>
          <Skeleton variant="text" width={160} height={22} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={180} height={22} />
        </TableCell>
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
          <Skeleton variant="rounded" width={100} height={32} />
        </TableCell>
      </TableRow>
    ));

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
              <Table
                stickyHeader
                aria-label="simple table"
                sx={{ tableLayout: 'fixed', whiteSpace: 'nowrap' }}
              >
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
                        // display: 'flex', // ✅ WAJIB
                        // alignItems: 'center',
                        // justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queryLoading
                    ? renderSkeletonRows(rowsPerPage)
                    : visitorData.map((visitor: VisitorType, index: number) => (
                        <TableRow key={visitor.id}>
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
                          <TableCell>
                            <Tooltip title={visitor.name} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.name}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.personId} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.personId}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.identityId} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.identityId}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.cardNumber} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.cardNumber}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.bleCardNumber} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.bleCardNumber}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.phone} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.phone}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.email} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.email}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.gender} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.gender}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={visitor.address} arrow placement="top">
                              <Box sx={ellipsisSx}>{visitor.address}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Box sx={ellipsisSx}>{visitor.isBlacklist ? 'Yes' : 'No'}</Box>
                          </TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              gap: 1,
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            <AddEditVisitor type="edit" visitor={visitor} />
                            {visitor.isBlacklist ? (
                              <Tooltip title="Unblacklist Visitor">
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleOpenUnblacklistDialog(visitor)}
                                >
                                  <IconCircleCheck size={20} />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Blacklist Visitor">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleOpenBlacklistDialog(visitor)}
                                >
                                  <IconForbid size={20} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Pagination */}
            <TablePagination
              component="div"
              count={visitorFilteredCount}
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
            Are you sure you want to delete visitor <strong>{selectedVisitor?.name}</strong>?
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

      {/* Blacklist Confirmation Dialog */}
      <Dialog
        open={blacklistDialogOpen}
        onClose={handleCloseBlacklistDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Blacklist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to blacklist visitor <strong>{selectedBList?.name}</strong>?
          </DialogContentText>
          <Grid size={12} mt={2}>
            <CustomTextField
              id="blacklistReason"
              label="Reason"
              multiline
              fullWidth
              value={blacklistReason}
              onChange={(e: any) => setBlacklistReason(e.target.value)}
            />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBlacklistDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBlacklist}
            color={queryLoading ? 'primary' : 'error'}
            disabled={queryLoading}
            startIcon={queryLoading ? <CircularProgress size={20} /> : null}
          >
            {queryLoading ? 'Blacklisting...' : 'Blacklist'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Unblacklist Confirmation Dialog */}
      <Dialog
        open={unblacklistDialogOpen}
        onClose={handleCloseUnblacklistDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Unblacklist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unblacklist visitor <strong>{selectedUList?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnblacklistDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUnblacklist}
            color={queryLoading ? 'primary' : 'error'}
            disabled={queryLoading}
            startIcon={queryLoading ? <CircularProgress size={20} /> : null}
          >
            {queryLoading ? 'Unblacklisting...' : 'Unblacklist'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default VisitorList;
