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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { CardGroupType, fetchCardGroupDT, UpdateFilter } from 'src/store/apps/crud/cardGroup';
import { defaultCardGroupFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Group Name', field: 'Name', sortAble: true },
  { label: 'Description', field: 'Remarks', sortAble: false },
  { label: 'Cards', field: '', sortAble: false },
  { label: 'Access', field: '', sortAble: false },
];

const SKELETON_ROWS = 5;

const CardGroupList = () => {
  const dispatch: AppDispatch = useDispatch();
  const cardGroupData = useSelector((state: RootState) => state.CardGroupReducer.cardGroups);
  const cardGroupTotalCount = useSelector(
    (state: RootState) => state.CardGroupReducer.cardGroupTotalCount,
  );
  const cardGroupFilteredCount = useSelector(
    (state: RootState) => state.CardGroupReducer.cardGroupFilteredCount,
  );
  const cardGroupFilter = useSelector((state: RootState) => state.CardGroupReducer.cardGroupFilter);
  const isLoading = useSelector((state: RootState) => state.CardGroupReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.CardGroupReducer.hasLoaded);

  //Pagination State
  const page = Math.floor(cardGroupFilter.Start / cardGroupFilter.Length);
  const rowsPerPage = cardGroupFilter.Length;
  const orderBy = cardGroupFilter.SortColumn;
  const order = cardGroupFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * cardGroupFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = cardGroupFilter.SortColumn === column && cardGroupFilter.SortDir === 'asc';
    const isDesc = cardGroupFilter.SortColumn === column && cardGroupFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'name',
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
    dispatch(UpdateFilter(defaultCardGroupFilter));
    try {
      dispatch(fetchCardGroupDT(defaultCardGroupFilter));
    } catch (error) {
      console.error('Error fetching data: ', error);
    }
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCardGroupDT(cardGroupFilter));
  }, [cardGroupFilter, dispatch]);

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
                    : cardGroupData.map((cardGroup: CardGroupType, index: number) => (
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
                          <TableCell>{cardGroup.name}</TableCell>
                          <TableCell>{cardGroup.remarks}</TableCell>
                          <TableCell>{cardGroup.cards?.length ?? 0}</TableCell>
                          <TableCell>{cardGroup.cardAccess?.length ?? 0}</TableCell>
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
                            {/* <AddEditFloorplan type="edit" floorplan={floorplan} /> */}
                            <IconButton
                              color="error"
                              size="small"
                              // onClick={() => handleOpenDeleteDialog(floorplan)}
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
              count={cardGroupTotalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>
      {/* Delete Confirmation Dialog */}
      {/* <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
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
              </Dialog> */}
    </Grid>
  );
};

export default CardGroupList;
