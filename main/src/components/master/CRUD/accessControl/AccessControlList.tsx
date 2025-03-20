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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  fetchAccessControls,
  AccessControlType,
  deleteAccessControl,
} from 'src/store/apps/crud/accessControl';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import { fetchApplications, ApplicationType } from 'src/store/apps/crud/application';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import AddEditAccessControl from './AddEditAccesControl';
import { useTranslation } from 'react-i18next';

const AccessControlList = () => {
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
  const accessControlData: AccessControlType[] = useSelector(
    (state: RootState) => state.accessControlReducer.accessControls,
  );
  const brandData: BrandType[] = useSelector((state: RootState) => state.brandReducer.brands);
  const appData: ApplicationType[] = useSelector(
    (state: RootState) => state.applicationReducer.applications,
  );

  useEffect(() => {
    dispatch(fetchAccessControls());
    dispatch(fetchBrands());
    dispatch(fetchApplications());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<AccessControlType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (control: AccessControlType) => {
    setSelectedControl(control);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedControl(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedControl) {
      dispatch(deleteAccessControl(selectedControl.id));
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
                      'ID',
                      'Brand Name',
                      'Name',
                      'Type',
                      'Description',
                      'Channel',
                      'Door ID',
                      'Raw',
                      'Integration Name',
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
                  {accessControlData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((accessControl, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{accessControl.id}</TableCell>
                        <TableCell>{getBrandName(accessControl.controllerBrandId)}</TableCell>
                        <TableCell>{accessControl.name}</TableCell>
                        <TableCell>{accessControl.type}</TableCell>
                        <TableCell>{accessControl.description}</TableCell>
                        <TableCell>{accessControl.channel}</TableCell>
                        <TableCell>{accessControl.doorId}</TableCell>
                        <TableCell>{accessControl.raw}</TableCell>
                        <TableCell>{accessControl.integrationId}</TableCell>
                        <TableCell>{getAppName(accessControl.applicationId)}</TableCell>

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
                          <AddEditAccessControl type="edit" accessControl={accessControl} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(accessControl)}
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
          count={accessControlData.length}
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
            Are you sure you want to delete the Access Control{' '}
            <strong>{selectedControl?.name}</strong>?
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

export default AccessControlList;
