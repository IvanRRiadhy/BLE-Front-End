import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid2 as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  TableSortLabel,
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  CardRecordType,
  fetchCardRecordDt,
  GetFilter,
  UpdateFilter,
} from 'src/store/apps/crud/cardRecord';
import { defaultCardRecordFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'User Name', field: 'name', sortAble: true },
  { label: 'Check-in', field: 'checkinAt', sortAble: true },
  { label: 'Check-out', field: 'checkoutAt', sortAble: true },
  { label: 'Status', field: 'visitor_type', sortAble: true },
];

const CardRecordList = () => {
  const dispatch: AppDispatch = useDispatch();
  const cardRecordData = useSelector((state: RootState) => state.CardRecordReducer.cardRecords);
  const CardRecordTotalCount = useSelector(
    (state: RootState) => state.CardRecordReducer.cardRecordTotalCount,
  );
  // const CardRecordFilteredCount: number = useSelector(
  //   (state: RootState) => state.CardRecordReducer.cardRecordFilteredCount,
  // );
  const CardRecordFilter: GetFilter = useSelector(
    (state: RootState) => state.CardRecordReducer.cardRecordFilter,
  );
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const hasLoaded = useSelector((state: RootState) => state.CardRecordReducer.hasLoaded);
  // Pagination State
  const page = Math.floor(CardRecordFilter.Start / CardRecordFilter.Length);
  const rowsPerPage = CardRecordFilter.Length;
  const orderBy = CardRecordFilter.SortColumn;
  const order = CardRecordFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * CardRecordFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = CardRecordFilter.SortColumn === column && CardRecordFilter.SortDir === 'asc';
    const isDesc = CardRecordFilter.SortColumn === column && CardRecordFilter.SortDir === 'desc';

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
    dispatch(UpdateFilter(defaultCardRecordFilter));
  }, [dispatch]);

  useEffect(() => {
    try {
      setLoading(true);
      dispatch(fetchCardRecordDt(CardRecordFilter));
    } catch (error) {
      console.error('Error fetching cardRecord data:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [CardRecordFilter, dispatch]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        {!hasLoaded ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
              <BlankCard>
                <TableContainer>
                  <Table aria-label="simple-table" sx={{ whiteSpace: 'nowrap' }}>
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cardRecordData.map((cardRecord, index) => (
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
                          <TableCell>{cardRecord.visitorName}</TableCell>
                          <TableCell>
                            {formatTime(cardRecord.checkinAt) +
                              ' - ' +
                              cardRecord.checkinMaskedArea}
                          </TableCell>
                          <TableCell>
                            {formatTime(cardRecord.checkoutAt) +
                              ' - ' +
                              cardRecord.checkoutMaskedArea}
                          </TableCell>
                          <TableCell>{cardRecord.visitorType}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {/* Pagination */}
                <TablePagination
                  component="div"
                  count={CardRecordTotalCount}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={handleChangePage}
                  rowsPerPageOptions={[5, 10, 25]}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </BlankCard>
            </Box>
          </>
        )}
      </Grid>
    </Grid>
  );
};

export default CardRecordList;
