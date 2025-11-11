import { BASE_URL } from 'src/utils/axios';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Stack,
  Grid2 as Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Backdrop,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  memberType,
  deleteMember,
  SelectMember,
  fetchMembers,
  blockMember,
  fetchMemberDT,
} from 'src/store/apps/crud/member';
import AddEditMember from '../../CRUD/member/AddEditMember';
import { IconTrash, IconSquareRoundedX, IconX } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { DepartmentType, fetchDepartments } from 'src/store/apps/crud/department';
import { DistrictType, fetchDistricts } from 'src/store/apps/crud/district';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';
import { useTranslation } from 'react-i18next';
// import IconClose from 'src/assets/images/frontend-pages/icons/icon-close.svg';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { PaginatedResponse } from 'src/hooks/useMember';

const MemberContent = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const selectedMemberId: string = useSelector(
    (state: RootState) => state.memberReducer.selectedMemberId || '',
  );

  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  // Get cached data for the member list
  const memberCache = queryClient.getQueryData<PaginatedResponse<memberType>>([
    'member-list',
    memberFilter,
  ]);

  // Resolve the selected member directly from cache
  const memberDetail = memberCache?.data.find((m) => m.id === selectedMemberId);
  const dispatch = useDispatch();
  // const theme = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
  }, [dispatch]);

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
    dispatch(SelectMember(''));
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedMember) {
      setLoading(true);
      try {
        const result = await dispatch(deleteMember(selectedMember.id));

        if (result && result.type && result.type.endsWith('/fulfilled')) {
          // ✅ Update cache manually
          queryClient.setQueryData<PaginatedResponse<memberType>>(
            ['member-list', memberFilter],
            (oldCache) =>
              oldCache
                ? {
                    ...oldCache,
                    data: oldCache.data.filter((m) => m.id !== selectedMember.id),
                    recordsTotal: oldCache.recordsTotal - 1,
                    recordsFiltered: oldCache.recordsFiltered - 1,
                  }
                : oldCache,
          );

          toast.success('Member deleted successfully');
        } else {
          toast.error('Delete failed');
        }
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error('Delete Data Unsuccessful');
      } finally {
        setLoading(false);
        handleCloseDeleteDialog();
      }
    }
  };

  //Block Member
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<memberType | null>(null);

  const openBlockDialog = (member: memberType) => {
    setTargetMember(member);
    setBlockDialogOpen(true);
  };

  const closeBlockDialog = () => {
    setBlockDialogOpen(false);
    setTargetMember(null);
  };

  const handleConfirmBlock = async () => {
    if (!targetMember) return;
    const newBlockState = !targetMember.isBlock;

    try {
      setLoading(true);
      const result = await dispatch(
        blockMember({ memberId: targetMember.id, IsBlock: newBlockState }),
      );

      if (result && result.type && result.type.endsWith('/fulfilled')) {
        // ✅ Update the cache inline
        queryClient.setQueryData<PaginatedResponse<memberType>>(
          ['member-list', memberFilter],
          (oldCache) =>
            oldCache
              ? {
                  ...oldCache,
                  data: oldCache.data.map((m) =>
                    m.id === targetMember.id ? { ...m, isBlock: newBlockState } : m,
                  ),
                }
              : oldCache,
        );

        toast.success(
          `Member "${targetMember.name}" ${newBlockState ? 'blocked' : 'unblocked'} successfully.`,
        );
      } else {
        toast.error(`Failed to ${newBlockState ? 'block' : 'unblock'} member.`);
      }
    } catch (error) {
      console.error('Error toggling block status:', error);
      toast.error('Something went wrong while updating block status.');
    } finally {
      setLoading(false);
      closeBlockDialog();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  return (
    <>
      {memberDetail ? (
        <>
          {/* Header Part */}
          <Box
            p={3}
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              background: memberDetail.isBlock
                ? 'linear-gradient(90deg, #e53935 0%, #ef5350 100%)' // vivid red
                : 'linear-gradient(90deg, #1e88e5 0%, #42a5f5 100%)', // vivid blue
              borderRadius: '8px',
              boxShadow: 3,
            }}
          >
            {/* Left Section */}
            <Typography
              variant="h5"
              fontWeight={700}
              color="#fff"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              Member Details
              {memberDetail.isBlock && (
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    color: '#fff',
                    borderRadius: 1,
                    px: 1,
                    py: 0.25,
                    fontWeight: 600,
                  }}
                >
                  BLOCKED
                </Typography>
              )}
            </Typography>

            {/* Right Section */}
            <Stack direction="row" alignItems="center" spacing={1.2}>
              {/* Edit */}
              <Tooltip title="Edit Member">
                <AddEditMember member={memberDetail} type="edit" />
              </Tooltip>

              {/* Delete */}
              <Tooltip title="Delete Member">
                <IconButton
                  onClick={() => handleOpenDeleteDialog(memberDetail)}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(0,0,0,0.15)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    transition: 'all 0.2s ease',
                    '& svg': {
                      color: '#fff',
                      filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.35)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <IconTrash size="18" stroke={1.6} />
                </IconButton>
              </Tooltip>

              {/* Close */}
              <Tooltip title="Close">
                <IconButton
                  onClick={() => dispatch(SelectMember(''))}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(0,0,0,0.15)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    transition: 'all 0.2s ease',
                    '& svg': {
                      color: '#fff',
                      filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.35)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <IconX size="18" stroke={1.6} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Divider />
          {/* Table Part */}

          <Box
            sx={{
              overflow: 'auto',
              height: { lg: 'calc(100vh - 220px)', md: '100vh' },
              maxHeight: '800px',
            }}
            p={5}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              mb={5}
              mr={5}
              sx={{ position: 'relative' }}
            >
              <Avatar
                alt="Member Profile"
                src={`${BASE_URL}${memberDetail.faceImage}`}
                sx={{ width: 200, height: 200, mb: 2 }}
              />
              <Box
                sx={{
                  position: { xs: 'static', md: 'absolute' },
                  top: { md: 0 },
                  left: { md: 0 },
                  zIndex: 2,
                }}
              >
                <Stack spacing={1} direction="column" alignItems="flex-start">
                  <Button
                    size="large"
                    variant="contained"
                    color={memberDetail.isBlock ? 'success' : 'error'}
                    onClick={() => openBlockDialog(memberDetail)}
                    sx={{
                      boxShadow: 2,
                      width: '12vw',
                      height: 50,
                      backgroundColor: memberDetail.isBlock ? '#66bb6a' : '#f08080',
                      '&:hover': {
                        backgroundColor: memberDetail.isBlock ? '#4caf50' : '#e57373',
                      },
                    }}
                  >
                    {memberDetail.isBlock ? 'Unblock Member' : 'Block Member'}
                  </Button>
                </Stack>
              </Box>
              <Typography variant="h4" fontWeight={800}>
                {memberDetail.name}
              </Typography>
            </Box>

            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <Typography>{memberDetail.email}</Typography>
                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{memberDetail.address}</Typography>
                <CustomFormLabel htmlFor="birth-Date">Birth Date</CustomFormLabel>
                <Typography>{formatDate(memberDetail.birthDate)}</Typography>
                <CustomFormLabel htmlFor="join-Date">Join Date</CustomFormLabel>
                <Typography>{formatDate(memberDetail.joinDate)}</Typography>
                <CustomFormLabel htmlFor="exit-Date">Exit Date</CustomFormLabel>
                <Typography>{formatDate(memberDetail.exitDate)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{memberDetail.phone}</Typography>
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{memberDetail.gender}</Typography>
                <CustomFormLabel htmlFor="head-Member-1">Head Member 1</CustomFormLabel>
                <Typography>{memberDetail.headMember1}</Typography>
                <CustomFormLabel htmlFor="head-Member-2">Head Member 2</CustomFormLabel>
                <Typography>{memberDetail.headMember2}</Typography>
                <CustomFormLabel htmlFor="status-employee">Status Employee</CustomFormLabel>
                <Typography>{memberDetail.statusEmployee}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{memberDetail.personId}</Typography>
                <CustomFormLabel htmlFor="department-Id">Department Name</CustomFormLabel>
                <Typography>{memberDetail.department?.name}</Typography>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{memberDetail.identityId}</Typography>
              </Grid>
              ``
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="organization-id">Organization Name</CustomFormLabel>
                <Typography>{memberDetail.organization?.name}</Typography>
                <CustomFormLabel htmlFor="district-id">District Name</CustomFormLabel>
                <Typography>{memberDetail.district?.name}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <Typography>{memberDetail.cardNumber}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>{memberDetail.bleCardNumber}</Typography>
              </Grid>
            </Grid>
          </Box>
          {/* Block / Unblock Dialog */}
          <Dialog open={blockDialogOpen} onClose={closeBlockDialog} fullWidth maxWidth="xs">
            <DialogTitle>{targetMember?.isBlock ? 'Unblock Member' : 'Block Member'}</DialogTitle>

            <DialogContent>
              {!targetMember?.isBlock && (
                <>
                  <DialogContentText>
                    Are you sure you want to block <strong>{targetMember?.name}</strong>?
                  </DialogContentText>
                </>
              )}

              {targetMember?.isBlock && (
                <DialogContentText>
                  Are you sure you want to unblock <strong>{targetMember?.name}</strong>?
                </DialogContentText>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={closeBlockDialog} color="primary">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBlock}
                color={targetMember?.isBlock ? 'success' : 'error'}
                variant="contained"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : targetMember?.isBlock ? (
                  'Unblock'
                ) : (
                  'Block'
                )}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
          {/* ------------------------------------------- */}
          {/* If no Contact  */}
          {/* ------------------------------------------- */}
          <Box>
            <Typography variant="h4">Please Select a Member</Typography>
            <br />
          </Box>
        </Box>
      )}
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
      {loading &&
        createPortal(
          <Backdrop
            open={loading}
            sx={{
              color: '#fff',
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>,
          document.body,
        )}
    </>
  );
};

export default MemberContent;
