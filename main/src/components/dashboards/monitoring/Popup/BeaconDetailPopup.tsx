import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DepartmentType, fetchDepartments } from 'src/store/apps/crud/department';
import { DistrictType, fetchDistricts } from 'src/store/apps/crud/district';
import { memberType } from 'src/store/apps/crud/member';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { masterVisitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';

type BeaconDetailPopupProps = {
  bleNumber: string;
  memberDetail?: memberType;
  visitorDetail?: masterVisitorType;
  area: string;
  floorplan: string;
  time: string;
  detailDialogOpen: boolean;
  setDetailDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenTrackDetail: React.Dispatch<React.SetStateAction<boolean>>;
};

const BASE_URL = 'http://192.168.1.116:5000';

const BeaconDetailPopup = ({
  bleNumber,
  memberDetail,
  visitorDetail,
  area,
  floorplan,
  time,
  detailDialogOpen,
  setDetailDialogOpen,
  setOpenTrackDetail,
}: BeaconDetailPopupProps) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const handleClose = () => {
    setDetailDialogOpen(false);
  };
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  useEffect(() => {
    dispatch(fetchOrganizations());
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
  }, [dispatch]);

  const getOrganizationName = (organizationId: string) => {
    const organization = organizationData.find(
      (org: OrganizationType) => org.id === organizationId,
    );
    return organization ? organization.name : 'Unknown Organization';
  };

  const getDistrictName = (districtId: string) => {
    const district = districtData.find((dst: DistrictType) => dst.id === districtId);
    return district ? district.name : 'Unknown District';
  };
  const getDepartmentName = (departmentId: string) => {
    const department = departmentData.find((dpt: DepartmentType) => dpt.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };
  // console.log(memberDetail, area, floorplan, time);
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  return (
    <Dialog fullWidth maxWidth={'md'} open={detailDialogOpen} onClose={handleClose}>
      <DialogTitle>
        <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
          {memberDetail ? 'Member Detail' : visitorDetail ? 'Visitor Detail' : 'Unknown Person'}
        </Typography>
        <Divider />
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} mb={2} p={2}>
          <Grid container size={12} direction={'row'} mb={2}>
            <Grid size={12} display={'flex'} justifyContent={'center'} mr={2}>
              <Avatar
                alt="Member Profile"
                src={`${BASE_URL}${
                  memberDetail ? memberDetail.faceImage : visitorDetail?.faceImage
                }`}
                sx={{ width: '128px', height: '128px', ml: 2 }}
              />
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Name :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.name
                    : visitorDetail
                    ? visitorDetail.name
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Phone :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.phone
                    : visitorDetail
                    ? visitorDetail.phone
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Email :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.email
                    : visitorDetail
                    ? visitorDetail.email
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Address :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.address
                    : visitorDetail
                    ? visitorDetail.address
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Gender :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.gender
                    : visitorDetail
                    ? visitorDetail.gender
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {memberDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Status :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {memberDetail.statusEmployee}
                    </Box>
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Status :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {visitorDetail.status}
                    </Box>
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {memberDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Organization :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {getOrganizationName(memberDetail.organizationId)}
                    </Box>
                    <br />
                    <Box
                      component="span"
                      typography={{ fontSize: '12px', fontWeight: '400' }}
                      sx={{ display: 'inline-block', ml: 'calc(1ch * 13)' }} // aligns after "Organization :"
                    >
                      {getDepartmentName(memberDetail.departmentId)} |{' '}
                      {getDistrictName(memberDetail.districtId)}
                    </Box>
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Visit Arrival :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {visitorDetail.visitorArrival}
                    </Box>
                  </Typography>
                </>
              )}
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              {memberDetail && (
                <Box>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Head Member :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      1. {memberDetail.headMember1}
                    </Box>
                    <br />
                    {memberDetail.headMember2 && memberDetail.headMember2 !== '' && (
                      <Box
                        component="span"
                        typography={{ fontSize: '14px', fontWeight: '500' }}
                        sx={{ display: 'inline-block', ml: 'calc(1ch * 12)' }} // aligns after "Organization :"
                      >
                        2. {memberDetail.headMember2}
                      </Box>
                    )}
                  </Typography>
                </Box>
              )}
              {visitorDetail && (
                <>
                  <Typography variant="h6" fontWeight={700} component="div">
                    <Box component="span">Visit End :</Box>{' '}
                    <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                      {visitorDetail.visitorEnd}
                    </Box>
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Area :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {area} | {floorplan}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Last Seen :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {formatDate(time)}
                </Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container size={12} direction={'row'}>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">Card Number :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {memberDetail
                    ? memberDetail.cardNumber
                    : visitorDetail
                    ? visitorDetail.cardNumber
                    : 'Unknown Person'}
                </Box>
              </Typography>
            </Grid>
            <Grid size={{ lg: 6, md: 6, sm: 12, xs: 12 }}>
              <Typography component="div" variant="h6" fontWeight={700}>
                <Box component="span">BLE Card Number :</Box>{' '}
                <Box component="span" typography={{ fontSize: '14px', fontWeight: '500' }}>
                  {bleNumber}
                </Box>
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          px: 0,
          py: 0,
          zIndex: 1,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setOpenTrackDetail(true)}
            sx={{
              width: '100%',
              height: '64px',
              borderRadius: 0,
            }}
          >
            Tracking Details
          </Button>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClose}
            sx={{
              width: '100%',
              height: '64px',
              borderRadius: 0,
            }}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default BeaconDetailPopup;
