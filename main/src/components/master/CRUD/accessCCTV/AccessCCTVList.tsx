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
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  CCTVType,
  deleteCCTV,
  fetchAccessCCTVDT,
  UpdateFilter,
} from 'src/store/apps/crud/accessCCTV';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import AddEditAccessCCTV from './AddEditAccessCCTV';
import { defaultAccessCCTVFilter } from 'src/store/apps/defaultForm';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'RTSP', field: 'Rtsp', sortAble: false },
  { label: 'Integration', field: 'IntegrationType', sortAble: false },
];

const AccessCCTVList = () => {
  const dispatch: AppDispatch = useDispatch();
  const CCTVData: CCTVType[] = useSelector((state: RootState) => state.CCTVReducer.cctvs);
  const CCTVTotalCount = useSelector((state: RootState) => state.CCTVReducer.cctvTotalCount);
  // const CCTVFilteredCount = useSelector((state: RootState) => state.CCTVReducer.cctvFilteredCount);
  const CCTVFilter = useSelector((state: RootState) => state.CCTVReducer.cctvFilter);
  const isLoading = useSelector((state: RootState) => state.CCTVReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.CCTVReducer.hasLoaded);
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(CCTVFilter.Start / CCTVFilter.Length);
  const rowsPerPage = CCTVFilter.Length;
  const orderBy = CCTVFilter.SortColumn;
  const order = CCTVFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * CCTVFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  useEffect(() => {
    dispatch(UpdateFilter(defaultAccessCCTVFilter));
    try {
      dispatch(fetchAccessCCTVDT(CCTVFilter));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    try {
      dispatch(fetchAccessCCTVDT(CCTVFilter));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    
    // dispatch(UpdateFilter(defaultAccessCCTVFilter));
  }, [CCTVFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (cctv: CCTVType) => {
    setSelectedCCTV(cctv);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedCCTV(null);
  };

  const handleConfirmDelete = () => {
    if (selectedCCTV) {
      dispatch(deleteCCTV(selectedCCTV.id));
    }
    handleCloseDeleteDialog();
  };

  const handleSort = (column: string) => {
    const isAsc = CCTVFilter.SortColumn === column && CCTVFilter.SortDir === 'asc';
    const isDesc = CCTVFilter.SortColumn === column && CCTVFilter.SortDir === 'desc';

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

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
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
                        <Typography variant="h6"> </Typography>
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
                    {CCTVData.map((cctv, index) => (
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
                        <TableCell>{cctv.name}</TableCell>
                        <TableCell>{cctv.rtsp}</TableCell>
                        <TableCell>{cctv.integration?.integrationType}</TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            right: 0,
                            background: 'white',
                            zIndex: 2,
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                            width: 150, // Fixed width
                            minWidth: 150,
                            maxWidth: 150,
                          }}
                        >
                          <AddEditAccessCCTV type="edit" cctv={cctv} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(cctv)}
                          >
                            <IconTrash size={20} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {/* Pagination */}
              <TablePagination
                component="div"
                count={CCTVTotalCount}
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
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Access CCTV <strong>{selectedCCTV?.name}</strong>?
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

export default AccessCCTVList;
