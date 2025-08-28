import React, { useEffect } from 'react';
import {
  Box,
  Grid2 as Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, TablePagination, TableSortLabel, Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { fetchBlacklistDT, UpdateFilter } from 'src/store/apps/crud/blacklist';
import { fetchVisitor } from 'src/store/apps/crud/visitor';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import DashboardCard from 'src/components/shared/DashboardCard';
import isEqual from 'lodash/isEqual';

const columns = [
  { label: 'Blacklisted Visitor', field: 'Visitor.Name', sortAble: true },
  { label: 'Blacklisted Area',    field: 'MaskedArea.Name', sortAble: true },
];

interface BlacklistTableProps {
  filterFloorplanId: string[];
}

const SKELETON_ROWS = 5;

const Blacklist: React.FC<BlacklistTableProps> = ({ filterFloorplanId }) => {
  const dispatch: AppDispatch = useDispatch();

  const blaclistData = useSelector((s: RootState) => s.blacklistReducer.blacklists);
  const blacklistFilteredCount = useSelector((s: RootState) => s.blacklistReducer.blacklistFilteredCount);
  const blacklistFilter = useSelector((s: RootState) => s.blacklistReducer.blacklistFilter);
  const hasLoaded = useSelector((s: RootState) => s.blacklistReducer.hasLoaded); // <-- flag

  // Pagination & sorting state
  const page = Math.floor(blacklistFilter.Start / blacklistFilter.Length);
  const rowsPerPage = blacklistFilter.Length;
  const orderBy = blacklistFilter.SortColumn;
  const order = blacklistFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * blacklistFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc  = blacklistFilter.SortColumn === column && blacklistFilter.SortDir === 'asc';
    const isDesc = blacklistFilter.SortColumn === column && blacklistFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(UpdateFilter({ SortColumn: '', SortDir: 'asc', Start: 0 }));
    } else {
      dispatch(UpdateFilter({ SortColumn: column, SortDir: isAsc ? 'desc' : 'asc', Start: 0 }));
    }
  };

  useEffect(() => {
    const currentFloorplanId = blacklistFilter.filters?.FloorplanMaskedAreaId || [];
    if (!isEqual(currentFloorplanId, filterFloorplanId)) {
      dispatch(UpdateFilter({
        filters: { ...blacklistFilter.filters, FloorplanMaskedAreaId: filterFloorplanId },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFloorplanId, blacklistFilter.filters]);

  useEffect(() => {
    dispatch(fetchBlacklistDT(blacklistFilter));
  }, [blacklistFilter, dispatch]);

  useEffect(() => {
    dispatch(fetchVisitor());
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloorplan());
  }, [dispatch]);

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {/* sticky index cell */}
          <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
            <Skeleton variant="text" width={18} />
          </TableCell>

          {/* Blacklisted Visitor */}
          <TableCell>
            <Skeleton variant="text" width={180} height={20} />
            <Skeleton variant="text" width={130} height={16} sx={{ mt: 0.5 }} />
          </TableCell>

          {/* Blacklisted Area */}
          <TableCell>
            <Skeleton variant="text" width={160} height={20} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <DashboardCard title="Blacklist">
      <Grid container spacing={3}>
        <Grid size={12}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 440, maxHeight: 440, overflow: 'auto', maxWidth: '100%' }}>
            <BlankCard>
              <TableContainer>
                <Table aria-label="blacklist table" sx={{ whiteSpace: 'nowrap' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>
                        <Typography variant="h6"> </Typography>
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.label}>
                          {col.sortAble && col.field ? (
                            <TableSortLabel
                              disabled={!hasLoaded} // disable while loading
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
                    {!hasLoaded ? (
                      renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    ) : (
                      <>
                        {blaclistData.map((blacklist, index) => (
                          <TableRow key={blacklist.id}>
                            <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                              {index + 1 + page * rowsPerPage}
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {blacklist.visitor?.name || 'Unknown Visitor'}
                                </Typography>
                                <Typography color="textSecondary" fontSize="12px" variant="subtitle2">
                                  {blacklist.visitor?.cardNumber || 'No Card Number'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                                {blacklist.floorplanMaskedArea?.name || 'Unknown Area'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* keep table height stable */}
                        {Array.from({
                          length: rowsPerPage - Math.min(rowsPerPage, blaclistData.length - page * rowsPerPage),
                        }).map((_, idx) => (
                          <TableRow key={`empty-row-${idx}`} style={{ height: 63 }}>
                            <TableCell colSpan={4} />
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </BlankCard>
          </Box>

          <TablePagination
            component="div"
            count={hasLoaded ? blacklistFilteredCount : rowsPerPage} // avoid jumpy pager while loading
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            rowsPerPageOptions={[5]}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Grid>
      </Grid>
    </DashboardCard>
  );
};

export default Blacklist;
