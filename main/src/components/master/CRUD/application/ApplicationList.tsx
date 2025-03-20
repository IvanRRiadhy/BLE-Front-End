import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { IconTrash } from '@tabler/icons-react';
import {
  fetchApplications,
  ApplicationType,
  deleteApplication,
} from 'src/store/apps/crud/application';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import AddEditApplication from './AddEditApplication';

const ApplicationList = () => {
  const { t } = useTranslation(); // Access the translation function
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
  const appList: ApplicationType[] = useSelector(
    (state: RootState) => state.applicationReducer.applications,
  );

  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (app: ApplicationType) => {
    setSelectedApp(app);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedApp(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedApp) {
      dispatch(deleteApplication(selectedApp.id));
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

  return (
    <Grid container spacing={3}>
      <Grid>
        <Box sx={{ overflow: 'auto' }}>
          <BlankCard>
            <TableContainer sx={{ width: '100%' }}>
              <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Empty Column */}
                    <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>
                      <Typography variant="h6"> Left </Typography>
                    </TableCell>
                    {[
                      'ID',
                      'Application Name',
                      'Organization Type',
                      'Organization Address',
                      'Application Type',
                      'Application Registered',
                      'Application Expired',
                      'Host Name',
                      'Host Phone',
                      'Host Email',
                      'Host Address',
                      'Application Custom Name',
                      'Application Custom Domain',
                      'Application Custom Port',
                      'License Code',
                      'License Type',
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
                  {appList
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((app) => (
                      <TableRow key={app.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        ></TableCell>

                        <TableCell>{app.id}</TableCell>
                        <TableCell>{app.applicationName}</TableCell>
                        <TableCell>{app.organizationType}</TableCell>
                        <TableCell>{app.organizationAddress}</TableCell>
                        <TableCell>{app.applicationType}</TableCell>
                        <TableCell>{formatTime(app.applicationRegistered)}</TableCell>
                        <TableCell>{formatTime(app.applicationExpired)}</TableCell>
                        <TableCell>{app.hostName}</TableCell>
                        <TableCell>{app.hostPhone}</TableCell>
                        <TableCell>{app.hostEmail}</TableCell>
                        <TableCell>{app.hostAddress}</TableCell>
                        <TableCell>{app.applicationCustomName}</TableCell>
                        <TableCell>{app.applicationCustomDomain}</TableCell>
                        <TableCell>{app.applicationCustomPort}</TableCell>
                        <TableCell>{app.licenseCode}</TableCell>
                        <TableCell>{app.licenseType}</TableCell>

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
                          <AddEditApplication type="edit" application={app} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(app)}
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
          count={appList.length}
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
            Are you sure you want to delete the application{' '}
            <strong>{selectedApp?.applicationName}</strong>?
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

export default ApplicationList;
