import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IntegrationType,
  UpdateFilter,
  deleteIntegration,
  fetchIntegrationDT,
} from 'src/store/apps/crud/integration';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch } from 'src/store/Store';
import AddEditIntegration from './AddEditIntegration';
import { defaultIntegrationFilter } from 'src/store/apps/defaultForm';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Brand Name', field: 'Brand.Name', sortAble: true },
  { label: 'Integration Type', field: 'IntegrationType', sortAble: true },
  { label: 'API Authentication Type', field: 'ApiTypeAuth', sortAble: true },
  { label: 'API URL', field: 'Brand.Name', sortAble: true },
];

const IntegrationList = () => {
  const dispatch: AppDispatch = useDispatch();
  const IntegrationData: IntegrationType[] = useSelector(
    (state: RootState) => state.integrationReducer.integrations,
  );
  // const IntegrationTotalCount = useSelector(
  //   (state: RootState) => state.integrationReducer.IntegrationTotalCount,
  // );
  const IntegrationFilteredCount = useSelector(
    (state: RootState) => state.integrationReducer.IntegrationFilteredCount,
  );
  const IntegrationFilter = useSelector(
    (state: RootState) => state.integrationReducer.IntegrationFilter,
  );
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(IntegrationFilter.Start / IntegrationFilter.Length);
  const rowsPerPage = IntegrationFilter.Length;
  const orderBy = IntegrationFilter.SortColumn;
  const order = IntegrationFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * IntegrationFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = IntegrationFilter.SortColumn === column && IntegrationFilter.SortDir === 'asc';
    const isDesc = IntegrationFilter.SortColumn === column && IntegrationFilter.SortDir === 'desc';

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
    dispatch(fetchIntegrationDT(IntegrationFilter));
  }, [IntegrationFilter, dispatch]);

  const brandData: BrandType[] = useSelector((state: RootState) => state.brandReducer.brands);

  useEffect(() => {
    dispatch(fetchBrands());
    dispatch(UpdateFilter(defaultIntegrationFilter));
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selecteInteg, setSelecteInteg] = useState<IntegrationType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (app: IntegrationType) => {
    setSelecteInteg(app);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelecteInteg(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selecteInteg) {
      dispatch(deleteIntegration(selecteInteg.id));
    }
    handleCloseDeleteDialog();
  };

  const getBrandName = (brandId: string) => {
    const brand = brandData.find((b: BrandType) => b.id === brandId);
    return brand ? brand.name : 'Unknown Brand';
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
                    <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>
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
                  {IntegrationData.map((integration, index) => (
                    <TableRow key={index}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{getBrandName(integration.brandId)}</TableCell>
                      <TableCell>{integration.integrationType}</TableCell>
                      <TableCell>{integration.apiTypeAuth}</TableCell>
                      <TableCell>{integration.apiUrl}</TableCell>

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
                        <AddEditIntegration type="edit" integration={integration} />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(integration)}
                        >
                          <IconTrash size={20} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
        {/* Pagination */}
        <TablePagination
          component="div"
          count={IntegrationFilteredCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Grid>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the integration <strong>{selecteInteg?.id}</strong>?
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

export default IntegrationList;
