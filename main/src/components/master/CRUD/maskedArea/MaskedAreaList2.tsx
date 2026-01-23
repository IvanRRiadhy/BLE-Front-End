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
  Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
// import { useTranslation } from 'react-i18next';
import { fetchMaskedAreas, GetAllMaskedArea } from 'src/store/apps/crud/maskedArea';
import {
  fetchFloorplan,
  fetchFloorplanDT,
  FloorplanType,
  SelectFloorplan,
  UpdateFilter,
} from 'src/store/apps/crud/floorplan';
import { IconEdit, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { defaultFloorplanFilter } from 'src/store/apps/defaultForm';
import { fetchFloorplanDevices } from 'src/store/apps/crud/floorplanDevice';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import FloorplanPreviewDialog from './FloorplanPreviewDialog';
import { useAllMaskedAreas, useMaskedAreaStatus } from 'src/hooks/useMaskedArea';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { UseQueryResult } from '@tanstack/react-query';
import { useFloorplanList } from 'src/hooks/useFloorplan';

const columns = [
  { label: 'Building', field: 'Floor.Name', sortAble: true },
  { label: 'Floor', field: 'Floor.Name', sortAble: true },
  { label: 'Floorplan', field: 'Name', sortAble: true },
  { label: 'Total Area', field: 'MaskedAreaCount', sortAble: true },
];

const SKELETON_ROWS = 5;

const MaskedAreaList2 = () => {
  const dispatch: AppDispatch = useDispatch();
  // const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  // // const buildingData: BuildingType[] = useSelector(
  // //   (state: RootState) => state.buildingReducer.buildingAll,
  // // );
  // const floorplanTotalCount = useSelector(
  //   (state: RootState) => state.floorplanReducer.floorplanTotalCount,
  // );
  
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  const buildingData: BuildingType[] = (useAllBuilding() as UseQueryResult<BuildingType[], Error>)['data'] || [];
  const {data: maskedAreaAll = []} = useAllMaskedAreas();

  const {data, isLoading: queryLoading} = useFloorplanList(floorplanFilter);
  const floorplanData = data?.data || [];
  const floorplanTotalCount = data?.recordsTotal || 0;
  const floorplanFilteredCount = data?.recordsFiltered || 0;
  // const { t } = useTranslation();
  const navigate = useNavigate();
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

  useEffect(() => {
    dispatch(UpdateFilter(defaultFloorplanFilter));
    dispatch(fetchBuildings());
  }, [dispatch]);

  useEffect(() => {
    dispatch(GetAllMaskedArea(maskedAreaAll));
  }, [dispatch, maskedAreaAll]);

  useEffect(() => {
    dispatch(fetchFloorplanDT(floorplanFilter));
  }, [dispatch, floorplanFilter]);

  const handleOnClick = (floorplanToEdit: FloorplanType) => {
    // console.log('floorplanToEdit: ', floorplanToEdit);
    dispatch(SelectFloorplan(floorplanToEdit));
    navigate('/master/floorplanmaskedarea/edit');
  };

  const getbuildingName = (buildingId: string) => {
    const building = buildingData.find((b) => b.id === buildingId);
    return building ? building.name : 'Unknown Building';
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
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

  //Floorplan Preview
  const [previewFloorplanId, setPreviewFloorplanId] = useState<string | null>(null);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          <BlankCard>
            <TableContainer  sx={{
              maxHeight: '55vh',
            }}>
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
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
                    : floorplanData.map((floorplan: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell
                            sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                          >
                            {getbuildingName(floorplan.floor?.buildingId || '')}
                          </TableCell>
                          <TableCell>{floorplan.floor?.name}</TableCell>
                          <TableCell>
                            {floorplan.name}{' '}
                            <IconButton
                              color="secondary"
                              size="small"
                              onClick={() => setPreviewFloorplanId(floorplan.id)}
                            >
                              <IconEye size={20} />
                            </IconButton>
                          </TableCell>
                          <TableCell>{floorplan.maskedAreaCount}</TableCell>

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
    </Grid>
  );
};

export default MaskedAreaList2;
