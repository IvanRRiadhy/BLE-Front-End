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
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { deleteMember, fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchDistricts, DistrictType } from 'src/store/apps/crud/district';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { fetchApplications, ApplicationType } from 'src/store/apps/crud/application';
import AddEditMember from './AddEditMember';
import { useTranslation } from 'react-i18next';

const MemberList = () => {
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
  const memberData = useSelector((state: RootState) => state.memberReducer.members);
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const applicationData = useSelector((state: RootState) => state.applicationReducer.applications);

  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
    dispatch(fetchApplications());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<memberType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (mem: memberType) => {
    setSelectedMember(mem);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMember(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedMember) {
      dispatch(deleteMember(selectedMember.id));
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

  const getDepartmentName = (departmentId: string) => {
    const department = departmentData.find((dpt: DepartmentType) => dpt.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };

  const getDistrictName = (districtId: string) => {
    const district = districtData.find((dst: DistrictType) => dst.id === districtId);
    return district ? district.name : 'Unknown District';
  };

  const getOrganizationName = (organizationId: string) => {
    const organization = organizationData.find(
      (org: OrganizationType) => org.id === organizationId,
    );
    return organization ? organization.name : 'Unknown Organization';
  };

  const getAppName = (appId: string) => {
    const app = applicationData.find((a: ApplicationType) => a.id === appId);
    return app ? app.applicationName : 'Unknown App';
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
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
                      'personId',
                      'Organization Name',
                      'Department Name',
                      'District Name',
                      'identityId',
                      'cardNumber',
                      'bleCardNumber',
                      'name',
                      'phone',
                      'email',
                      'gender',
                      'address',
                      'faceImage',
                      'birthDate',
                      'joinDate',
                      'exitDate',
                      'headMember1',
                      'headMember2',
                      'Application Name',
                      'statusEmployee',
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
                  {memberData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((member: memberType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{member.personId}</TableCell>
                        <TableCell>{getOrganizationName(member.organizationId)}</TableCell>
                        <TableCell>{getDepartmentName(member.departmentId)}</TableCell>
                        <TableCell>{getDistrictName(member.districtId)}</TableCell>
                        <TableCell>{member.identityId}</TableCell>
                        <TableCell>{member.cardNumber}</TableCell>
                        <TableCell>{member.bleCardNumber}</TableCell>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.gender}</TableCell>
                        <TableCell>{member.address}</TableCell>
                        <TableCell>{member.faceImage}</TableCell>
                        <TableCell>{formatDate(member.birthDate)}</TableCell>
                        <TableCell>{formatDate(member.joinDate)}</TableCell>
                        <TableCell>{formatDate(member.exitDate)}</TableCell>
                        <TableCell>{member.headMember1}</TableCell>
                        <TableCell>{member.headMember2}</TableCell>
                        <TableCell>{getAppName(member.applicationId)}</TableCell>
                        <TableCell>{member.statusEmployee}</TableCell>
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
                          <AddEditMember type="edit" member={member} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(member)}
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
              count={memberData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete member <strong>{selectedMember?.name}</strong>?
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

export default MemberList;
