import { useEffect, useState } from 'react';
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
} from '@mui/material';
import { memberType, deleteMember, SelectMember } from 'src/store/apps/crud/member';
import { IconTrash } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { useTranslation } from 'react-i18next';
import IconClose from 'src/assets/images/frontend-pages/icons/icon-close.svg';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';

const AboutPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);
  const appData = useSelector((state: RootState) => state.applicationReducer.applications);
  const currentApp = appData.find(
    (app: ApplicationType) => app.id === localStorage.getItem('applicationId'),
  );
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  return (
    <>
      {currentApp ? (
        <>
          {/* Header Part */}
          <Box p={3} py={2} display={'flex'} alignItems={'center'}>
            <Typography variant="h4">{currentApp.applicationName}</Typography>
          </Box>
          <Divider />
          {/* Table Part */}

          <Box sx={{ overflow: 'auto' }} p={5}>
            <Box display="flex" alignItems="center">
              <Box >
                <Typography variant="h5" mb={0.5}>
                  {currentApp.applicationCustomName}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>

                <CustomFormLabel htmlFor="address">Organization Address</CustomFormLabel>
                <Typography>{currentApp.organizationAddress}</Typography>

                <CustomFormLabel htmlFor="application-registration">Application Registration</CustomFormLabel>
                <Typography>{formatDate(currentApp.applicationRegistered)}</Typography>
                <CustomFormLabel htmlFor="application-Domain">Application Domain</CustomFormLabel>
                <Typography>{`${currentApp.applicationCustomDomain}:${currentApp.applicationCustomPort}`}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="applicationType">Application Type</CustomFormLabel>
                <Typography>{currentApp.applicationType}</Typography>
                <CustomFormLabel htmlFor="application-expiration">Application Expiration</CustomFormLabel>
                <Typography>{currentApp.applicationExpired}</Typography>
              </Grid>
            </Grid>
            <Typography variant="h5" fontWeight={600} mb={2} mt={2}>
              Host
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="Host">Host</CustomFormLabel>
                <Typography>{currentApp.hostName}</Typography>
                <CustomFormLabel htmlFor="PhoneNumber">Phone Number</CustomFormLabel>
                <Typography>{currentApp.hostPhone}</Typography>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="organization-id">E-Mail Address</CustomFormLabel>
                <Typography>{currentApp.hostEmail}</Typography>
                <CustomFormLabel htmlFor="district-id">Address</CustomFormLabel>
                <Typography>{currentApp.hostAddress}</Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export default AboutPage;
