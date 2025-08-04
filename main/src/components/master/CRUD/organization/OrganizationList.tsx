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
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import {
  OrganizationType,
  UpdateFilter,
  deleteOrganization,
  fetchOrganizationDT,
} from 'src/store/apps/crud/organization';
import AddEditOrganization from './AddEditOrganizationList';
import { defaultOrganizationFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Organization Code', field: '', sortAble: false },
  { label: 'Organization Name', field: 'Name', sortAble: true },
  { label: 'Organization Host', field: 'OrganizationHost', sortAble: true },
];

const OrganizationList = () => {
  const dispatch: AppDispatch = useDispatch();
  const organizationData: OrganizationType[] = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  // const organizationTotalCount = useSelector((state: RootState) => state.organizationReducer.organizationTotalCount);
  const organizationFilteredCount = useSelector(
    (state: RootState) => state.organizationReducer.organizationFilteredCount,
  );
  const organizationFilter = useSelector(
    (state: RootState) => state.organizationReducer.organizationFilter,
  );
  const prevFilterRef = useRef(organizationFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Pagination State
  const page = Math.floor(organizationFilter.Start / organizationFilter.Length);
  const rowsPerPage = organizationFilter.Length;
  const orderBy = organizationFilter.SortColumn;
  const order = organizationFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * organizationFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = organizationFilter.SortColumn === column && organizationFilter.SortDir === 'asc';
    const isDesc =
      organizationFilter.SortColumn === column && organizationFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'UpdatedAt',
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
    dispatch(UpdateFilter(defaultOrganizationFilter));
    try {
      setLoading(true);
      dispatch(fetchOrganizationDT(defaultOrganizationFilter));
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartorLengthChanged =
      prevFilter.Start !== organizationFilter.Start ||
      prevFilter.Length !== organizationFilter.Length;
    if (isStartorLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchOrganizationDT(organizationFilter)).finally(() => {
      if (isStartorLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    prevFilterRef.current = organizationFilter;
  }, [organizationFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (org: OrganizationType) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedOrg(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedOrg) {
      setLoading(true);
      try {
        const result = await dispatch(deleteOrganization(selectedOrg.id));
        if (result && result.type && result.type.endsWith('/fulfilled')) {
          await dispatch(fetchOrganizationDT(organizationFilter));
          toast.success('Data Deleted');
        }
      } catch (error) {
        toast.error('Delete Data Unsuccessful');
        console.error('Error deleting organization:', error);
      }
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
    handleCloseDeleteDialog();
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}
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
                        sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 2 }}
                      >
                        <Typography variant="h6"> Actions </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {organizationData.map((organization, index) => (
                      <TableRow key={organization.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1 + page * rowsPerPage}
                        </TableCell>
                        <TableCell>{organization.code}</TableCell>
                        <TableCell>{organization.name}</TableCell>
                        <TableCell>{organization.organizationHost}</TableCell>
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
                          <AddEditOrganization type="edit" organization={organization} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(organization)}
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
                count={organizationFilteredCount}
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
            Are you sure you want to delete the organization <strong>{selectedOrg?.name}</strong>?
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
export default OrganizationList;
