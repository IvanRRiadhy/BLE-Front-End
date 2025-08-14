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
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import { TrxVisitorType, UpdateFilter, fetchTrxVisitorDT } from 'src/store/apps/crud/trxVisitor';
import { defaultTrxVisitorFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';

const columns = [
  { label: 'Visitor', field: 'Visitor.Name', sortAble: true },
  { label: 'Agenda', field: '', sortAble: false},
  { label: 'Visit Start', field: 'VisitorPeriodStart', sortAble: true },
  { label: 'Visit End', field: 'VisitorPeriodEnd', sortAble: true },
  { label: 'Area', field: 'Area.Name', sortAble: true },
  { label: 'Status', field: 'Status', sortAble: true },
  { label: 'Accepted', field: 'IsInvitationAccepted', sortAble: true },
];

const InvitationList = () => {
  const dispatch: AppDispatch = useDispatch();
  const trxVisitorData = useSelector((state: RootState) => state.TrxVisitorReducer.TrxVisitors);
  const trxVisitorFilteredCount = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilteredCount,
  );
  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter,
  );
  const prevFilterRef = useRef(trxVisitorFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Pagination State
  const page = Math.floor(trxVisitorFilter.Start / trxVisitorFilter.Length);
  const rowsPerPage = trxVisitorFilter.Length;
  const orderBy = trxVisitorFilter.SortColumn;
  const order = trxVisitorFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * trxVisitorFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = trxVisitorFilter.SortColumn === column && trxVisitorFilter.SortDir === 'asc';
    const isDesc = trxVisitorFilter.SortColumn === column && trxVisitorFilter.SortDir === 'desc';

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

  useEffect(() => {
    dispatch(UpdateFilter(defaultTrxVisitorFilter));
    try {
      setLoading(true);
      dispatch(fetchTrxVisitorDT(defaultTrxVisitorFilter));
    } catch (error) {
      console.error('Error fetching Invitation data:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartorLengthChanged =
      prevFilter.Start !== trxVisitorFilter.Start || prevFilter.Length !== trxVisitorFilter.Length;
    if (isStartorLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchTrxVisitorDT(trxVisitorFilter)).finally(() => {
      if (isStartorLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    prevFilterRef.current = trxVisitorFilter;
  }, [trxVisitorFilter, dispatch]);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
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
                    {trxVisitorData.map((trx, index) => (
                      <TableRow key={trx.id}>
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
                        <TableCell>{trx.visitor?.name}</TableCell>
                        <TableCell>{trx.agenda}</TableCell>
                        <TableCell>{trx.visitorPeriodStart}</TableCell>
                        <TableCell>{trx.visitorPeriodEnd}</TableCell>
                        <TableCell>{trx.maskedarea?.name}</TableCell>
                        <TableCell>{trx.status}</TableCell>
                        <TableCell>{trx.isInvitationAccepted === true ? 'Yes' : 'No'}</TableCell>
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
                          {/* <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(organization)}
                          >
                            <IconTrash size={20} />
                          </IconButton> */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {/* Pagination */}
              <TablePagination
                component="div"
                count={trxVisitorFilteredCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handleChangePage}
                rowsPerPageOptions={[5, 10, 25]}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </BlankCard>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default InvitationList;