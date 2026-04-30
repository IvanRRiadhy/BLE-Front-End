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
  SelectMemberId,
  fetchMembers,
  fetchMemberDT,
  blacklistMember,
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
import { PaginatedResponse, useBlacklistMember, useUnBlacklistMember } from 'src/hooks/useMember';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useAllDistricts } from 'src/hooks/useDistrict';
import { useAllDepartments } from 'src/hooks/useDepartment';
import { useAllOrganizations } from 'src/hooks/useOrganization';
import AddEditSecurityGuard from './AddEditSecurityGuard';
import { useReleaseCard } from 'src/hooks/useCard';

const SecurityGuardContent = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const selectedMemberId: string = useSelector(
    (state: RootState) => state.memberReducer.selectedMemberId || '',
  );

  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const districtData = useAllDistricts();
  const departmentData = useAllDepartments();
  const organizationData = useAllOrganizations();
  // Get cached data for the member list
  const memberCache = queryClient.getQueryData<PaginatedResponse<memberType>>([
    'security-list',
    memberFilter,
  ]);

  // Resolve the selected member directly from cache
  const securityGuardDetail = memberCache?.data.find((m) => m.id === selectedMemberId);
  const dispatch = useDispatch();
  // const theme = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
  }, [dispatch]);

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
    dispatch(SelectMemberId(''));
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
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [targetSecurityGuard, setTargetMember] = useState<memberType | null>(null);
  const [reason, setReason] = useState<string>('');
  const { mutateAsync: blacklistMutation, isPending: isBlacklistPending } = useBlacklistMember();

  const handleOpenBlacklistDialog = (member: memberType) => {
    console.log('member to blacklist:', member);
    setTargetMember(member);
    setBlacklistDialogOpen(true);
  };

  const handleCloseBlacklistDialog = () => {
    setBlacklistDialogOpen(false);
    setTargetMember(null);
  };

  const handleConfirmBlacklist = async () => {
    // if (targetSecurityGuard) {
    //   dispatch(blacklistVisitor(targetSecurityGuard.id));
    // }
    if (targetSecurityGuard && reason) {
      try {
        await blacklistMutation({
          memberId: targetSecurityGuard.id,
          blacklistReason: reason,
        });
        toast.success('Member has been Blacklisted');
      } catch (error) {
        toast.error('Failed to blacklist member');
        console.error(error);
      }
    }
    handleCloseBlacklistDialog();
  };

  //UnBlacklist Popup
  const [unblacklistDialogOpen, setUnblacklistDialogOpen] = useState(false);
  const [selectedUList, setSelectedUList] = useState<memberType | null>(null);
  const { mutateAsync: unblacklistMutation, isPending: isUnblacklistPending } =
    useUnBlacklistMember();
  // Open delete confirmation dialog
  const handleOpenUnblacklistDialog = (mem: memberType) => {
    setSelectedUList(mem);
    setUnblacklistDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseUnblacklistDialog = () => {
    setUnblacklistDialogOpen(false);
    setSelectedUList(null);
  };

  // Confirm delete action
  const handleConfirmUnblacklist = async () => {
    // if (targetSecurityGuard) {
    //   dispatch(blacklistVisitor(targetSecurityGuard.id));
    // }
    if (selectedUList) {
      try {
        await unblacklistMutation(selectedUList.id);
        toast.success('Member has been Unblacklisted');
      } catch (error) {
        toast.error('Failed to unblacklist member');
        console.error(error);
      }
    }
    handleCloseUnblacklistDialog();
  };

   //Release Pop-up
        const [selectedCardNumber, setSelectedCardNumber] = useState('');
        const [releasePopupOpen, setReleasePopupOpen] = useState(false);
        const releaseMutation = useReleaseCard();
        //Open release pop-up
        const handleOpenReleasePopup = (cardNumber: string) => {
          setSelectedCardNumber(cardNumber);
          setReleasePopupOpen(true);
        };
      
        // Close release pop-up
        const handleCloseReleasePopup = () => {
          setReleasePopupOpen(false);
          setSelectedCardNumber('');
        };
      
        // Confirm release action
        const handleConfirmRelease = async () => {
          if (selectedCardNumber) {
            try {
              await releaseMutation.mutateAsync(selectedCardNumber);
              toast.success('Card Released');
            } catch (error) {
              toast.error('Release failed');
              console.error(error);
            }
          }
          handleCloseReleasePopup();
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
      {securityGuardDetail ? (
        <>
          {/* Header Part */}
          <Box
            p={3}
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              background: securityGuardDetail.isBlacklist
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
              Security Guard Details
              {securityGuardDetail.isBlacklist && (
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
              <Tooltip title="Edit Security Guard">
                <AddEditSecurityGuard member={securityGuardDetail} type="edit" />
              </Tooltip>

              {/* Delete */}
              <Tooltip title="Delete Security Guard">
                <IconButton
                  onClick={() => handleOpenDeleteDialog(securityGuardDetail)}
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
                  onClick={() => dispatch(SelectMemberId(''))}
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
                alt="Security Guard Profile"
                src={`${BASE_URL}${securityGuardDetail.faceImage}`}
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
                    color={securityGuardDetail.isBlacklist ? 'success' : 'error'}
                    onClick={() => {
                      securityGuardDetail.isBlacklist
                        ? handleOpenUnblacklistDialog(securityGuardDetail)
                        : handleOpenBlacklistDialog(securityGuardDetail);
                    }}
                    sx={{
                      boxShadow: 2,
                      width: '12vw',
                      height: 50,
                      backgroundColor: securityGuardDetail.isBlacklist ? '#66bb6a' : '#f08080',
                      '&:hover': {
                        backgroundColor: securityGuardDetail.isBlacklist ? '#4caf50' : '#e57373',
                      },
                    }}
                  >
                    {securityGuardDetail.isBlacklist ? 'Unblacklist Security Guard' : 'Blacklist Security Guard'}
                  </Button>
                                    {
                                      securityGuardDetail.cardNumber && (
                                        <Button
                                          size='large'
                                          variant='contained'
                                          color='info'
                                          onClick={() => {
                                            handleOpenReleasePopup(securityGuardDetail.cardNumber)
                                          }}
                                          sx={{
                                            boxShadow: 2,
                                            width: '12vw',
                                            height: 50,
                                          }}
                                        >
                                          Release Card
                                        </Button>
                                      )
                                    }
                </Stack>
              </Box>
              <Typography variant="h4" fontWeight={800}>
                {securityGuardDetail.name}
              </Typography>
              {/* 🚨 WARNING BOX FOR BLACKLISTED MEMBER */}
              {securityGuardDetail.isBlacklist && securityGuardDetail.blacklistReason && (
                <Box
                  sx={{
                    mt: 2,
                    px: 3,
                    py: 2,
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid #e53935',
                    borderRadius: 2,
                    width: '100%',
                    maxWidth: 500,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} color="#c62828">
                    ⚠ Blacklist Reason
                  </Typography>
                  <Typography variant="body2" color="#7f0000" mt={1}>
                    {securityGuardDetail.blacklistReason}
                  </Typography>
                </Box>
              )}
            </Box>

            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <Typography>{securityGuardDetail.email}</Typography>
                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <Typography>{securityGuardDetail.address}</Typography>
                <CustomFormLabel htmlFor="birth-Date">Birth Date</CustomFormLabel>
                <Typography>{formatDate(securityGuardDetail.birthDate)}</Typography>
                <CustomFormLabel htmlFor="join-Date">Join Date</CustomFormLabel>
                <Typography>{formatDate(securityGuardDetail.joinDate)}</Typography>
                <CustomFormLabel htmlFor="exit-Date">Exit Date</CustomFormLabel>
                <Typography>{formatDate(securityGuardDetail.exitDate)}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <Typography>{securityGuardDetail.phone}</Typography>
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <Typography>{securityGuardDetail.gender}</Typography>
                <CustomFormLabel htmlFor="head-Member-1">Head Security 1</CustomFormLabel>
                <Typography>{securityGuardDetail.headMember1}</Typography>
                <CustomFormLabel htmlFor="head-Member-2">Head Security 2</CustomFormLabel>
                <Typography>{securityGuardDetail.headMember2}</Typography>
                <CustomFormLabel htmlFor="status-employee">Status Employee</CustomFormLabel>
                <Typography>{securityGuardDetail.statusEmployee}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <Typography>{securityGuardDetail.personId}</Typography>
                <CustomFormLabel htmlFor="department-Id">Department Name</CustomFormLabel>
                <Typography>{securityGuardDetail.department?.name}</Typography>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <Typography>{securityGuardDetail.identityId}</Typography>
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="organization-id">Organization Name</CustomFormLabel>
                <Typography>{securityGuardDetail.organization?.name}</Typography>
                <CustomFormLabel htmlFor="district-id">District Name</CustomFormLabel>
                <Typography>{securityGuardDetail.district?.name}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <Typography>{securityGuardDetail.cardNumber}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} display="flex" flexDirection={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <Typography>{securityGuardDetail.bleCardNumber}</Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      ) : (
        <Box p={3} height="50vh" display={'flex'} justifyContent="center" alignItems={'center'}>
          {/* ------------------------------------------- */}
          {/* If no Contact  */}
          {/* ------------------------------------------- */}
          <Box>
            <Typography variant="h4">Please Select a Security Guard</Typography>
            <br />
          </Box>
        </Box>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete security guard <strong>{selectedMember?.name}</strong>?
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
      {/* Blacklist Confirmation Dialog */}
      <Dialog
        open={blacklistDialogOpen}
        onClose={handleCloseBlacklistDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Blacklist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to blacklist security guard <strong>{targetSecurityGuard?.name}</strong>?
          </DialogContentText>
          <Grid size={12} mt={2}>
            <CustomTextField
              id="reason"
              label="Reason"
              multiline
              fullWidth
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
            />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBlacklistDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBlacklist}
            color={isBlacklistPending ? 'primary' : 'error'}
            disabled={isBlacklistPending}
            startIcon={isBlacklistPending ? <CircularProgress size={20} /> : null}
          >
            {isBlacklistPending ? 'Blacklisting...' : 'Blacklist'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Unblacklist Confirmation Dialog */}
      <Dialog
        open={unblacklistDialogOpen}
        onClose={handleCloseUnblacklistDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Unblacklist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unblacklist security guard <strong>{selectedUList?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnblacklistDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUnblacklist}
            color={isUnblacklistPending ? 'primary' : 'error'}
            disabled={isUnblacklistPending}
            startIcon={isUnblacklistPending ? <CircularProgress size={20} /> : null}
          >
            {isUnblacklistPending ? 'Unblacklisting...' : 'Unblacklist'}
          </Button>
        </DialogActions>
      </Dialog>
                        {/* Delete Release Dialog */}
                  <Dialog open={releasePopupOpen} onClose={handleCloseReleasePopup}>
                    <DialogTitle>Confirm Card Release</DialogTitle>
                    <DialogContent>
                      <DialogContentText>
                        Are you sure you want to release the Card <strong>{selectedCardNumber}</strong> from its user <strong>{selectedMember?.name}</strong>?
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleCloseReleasePopup} color="primary">
                        Cancel
                      </Button>
                      <Button onClick={handleConfirmRelease} color="error">
                        Confirm
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

export default SecurityGuardContent;
