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
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
// import { useTranslation } from 'react-i18next';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import {
  fetchFloorplan,
  fetchFloorplanDT,
  SelectFloorplan,
  UpdateFilter,
} from 'src/store/apps/crud/floorplan';
import { IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

const columns = [
  { label: 'Floorplan', field: 'Name', sortAble: true },
  { label: 'Total Area', field: 'MaskedAreaCount', sortAble: true },
];

const MaskedAreaList2 = () => {
  const dispatch: AppDispatch = useDispatch();
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  const floorplanFilteredCount = useSelector(
    (state: RootState) => state.floorplanReducer.floorplanFilteredCount,
  );
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  // const { t } = useTranslation();
  const navigate = useNavigate();
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

  useEffect(() => {
    dispatch(fetchFloorplanDT(floorplanFilter));
  }, [dispatch, floorplanFilter]);

  const handleOnClick = (id: string) => {
    // console.log('id: ', id);
    dispatch(SelectFloorplan(id));
    navigate('/master/floorplanmaskedarea/edit');
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
                      sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 2 }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {floorplanData.map((floorplan: any, index) => (
                    <TableRow key={index}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {floorplan.name}
                      </TableCell>
                      <TableCell>{floorplan.maskedAreaCount}</TableCell>

                      <TableCell
                        sx={{
                          position: 'sticky',
                          right: 0,
                          background: 'white',
                          zIndex: 2,
                          display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                        }}
                      >
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOnClick(floorplan.id)}
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
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default MaskedAreaList2;
