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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IntegrationType,
  deleteIntegration,
  fetchIntegrations,
} from 'src/store/apps/crud/integration';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch } from 'src/store/Store';
import AddEditIntegration from './AddEditIntegration';
import { useTranslation } from 'react-i18next';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';

const IntegrationList = () => {
  const { t } = useTranslation();
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 rows per page
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(event);
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const dispatch: AppDispatch = useDispatch();
  const IntegrationData: IntegrationType[] = useSelector(
    (state: RootState) => state.integrationReducer.integrations,
  );
  const brandData: BrandType[] = useSelector((state: RootState) => state.brandReducer.brands);
  const appData: ApplicationType[] = useSelector(
    (state: RootState) => state.applicationReducer.applications,
  );

  useEffect(() => {
    dispatch(fetchIntegrations());
    dispatch(fetchBrands());
    dispatch(fetchApplications());
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

  const getBrandName = (brandId: string) => {
    const brand = brandData.find((b: BrandType) => b.id === brandId);
    return brand ? brand.name : 'Unknown Brand';
  };

  const getAppName = (appId: string) => {
    const app = appData.find((a: ApplicationType) => a.id === appId);
    return app ? app.applicationName : 'Unknown App';
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
                    {[
                      'Brand Name',
                      'Integration Type',
                      'API Authentication Type',
                      'API URL',
                      'API Authentication Username',
                      'API Authentication Password',
                      'API Key Field',
                      'API Key Value',
                      'Application Name',
                    ].map((header) => (
                      <TableCell key={header}>
                        <Typography variant="h6">{header}</Typography>
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
                  {IntegrationData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(
                    (integration, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{getBrandName(integration.brandId)}</TableCell>
                        <TableCell>{integration.integrationType}</TableCell>
                        <TableCell>{integration.apiTypeAuth}</TableCell>
                        <TableCell>{integration.apiUrl}</TableCell>
                        <TableCell>{integration.apiAuthUsername}</TableCell>
                        <TableCell>{integration.apiAuthPasswd}</TableCell>
                        <TableCell>{integration.apiKeyField}</TableCell>
                        <TableCell>{integration.apiKeyValue}</TableCell>
                        <TableCell>{getAppName(integration.applicationId)}</TableCell>

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
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
        {/* Pagination */}
        <TablePagination
          component="div"
          count={IntegrationData.length}
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
