import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  CircularProgress,
  FormHelperText,
  Backdrop,
  Container,
  Paper,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  declineInvitation,
  fetchVisitorbyId,
  fillFormVisitor,
  VisitorType,
} from 'src/store/apps/crud/visitor';
import { AppDispatch, dispatch, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import { fetchTrxVisitorById, TrxVisitorType } from 'src/store/apps/crud/trxVisitor';
import { BASE_URL } from 'src/utils/axios';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const InvitationInfo = () => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const query = useQuery();
  const code = query.get('code');
  const applicationId = query.get('applicationId');
  const visitorId = query.get('visitorId');
  const trxVisitorId = query.get('trxVisitorId');
  const memberId = query.get('memberId');
  const purposePersonId = query.get('purposePersonId');
  const [visitorInfo, setVisitorInfo] = useState<VisitorType | null>(null);
  const [trxVisitorInfo, setTrxVisitorInfo] = useState<TrxVisitorType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  console.log(code, applicationId, visitorId, trxVisitorId);

  useEffect(() => {
    setLoading(true);
    if (visitorId && trxVisitorId) {
      const fetchData = async () => {
        try {
          const data = await dispatch(fetchVisitorbyId(visitorId));
          const trxData = await dispatch(fetchTrxVisitorById(trxVisitorId));
          if (data) {
            setVisitorInfo(data);
            setTrxVisitorInfo(trxData);
            setPreview(data?.faceImage || null);
            console.log(data);
            console.log(trxData);
          } else {
            toast.error('Visitor not found');
          }
        } catch (err) {
          toast.error('Failed to load visitor data');
        } finally {
          setTimeout(() => {
            setLoading(false);
          }, 1500);
        }
      };
      fetchData();
    }
  }, []);

  const [late, setLate] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    if (trxVisitorInfo) {
      const createdAt = new Date(trxVisitorInfo.invitationCreatedAt);
      const now = new Date();

      // Calculate expiration date (3 days after createdAt)
      const expirationDate = new Date(createdAt);
      expirationDate.setDate(expirationDate.getDate() + 3);

      if (now > expirationDate) {
        setLate(true);
      } else {
        setLate(false);
      }
      setAlreadyAccepted(trxVisitorInfo.isInvitationAccepted);
    }
  }, [trxVisitorInfo]);

  const goToVisitorForm = () => {
    navigate(`/visitor-form${location.search}`);
  };
  const handleDecline = async () => {
    let result;
    try {
      result = await dispatch(declineInvitation(trxVisitorId || ''));
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
    if (!result) {
      toast.error('Error declining invitation');
      return;
    } else {
      navigate(`/thank-you`);
    }
  };
  const handleSubmit = async () => {
    setIsSaving(true);
    setLoading(true);
    if (!visitorInfo) {
      toast.error('Visitor not found');
      return;
    }
    // Prepare FormData
    const data = new FormData();
    Object.entries(visitorInfo).forEach(([key, value]) => {
      // Only append if value is not empty string, null, or undefined
      if (
        value !== null &&
        value !== undefined &&
        !(typeof value === 'string' && value.trim() === '')
      ) {
        data.append(key, value as any);
      }
    });

    try {
      for (const [key, value] of data.entries()) {
        console.log(key, value);
      }

      const result = await dispatch(
        fillFormVisitor({
          code: code || '',
          visitorId: visitorId || '',
          applicationId: applicationId || '',
          trxVisitorId: trxVisitorId || '',
          formData: data,
        }),
      ).unwrap();
      if (result.success) {
        navigate('/thank-you');
        toast.success('Submitted successfully!');
        setPreview(null);
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Failed to submit!');
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        setLoading(false);
      }, 1500);
    }
  };

  if (late && !loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          // colored gutters (left/right)
          bgcolor: '#e3edfd', // pick any soft color you like
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          py: { xs: 0, sm: 1 }, // top/bottom breathing room
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', padding: 3 }}>
            <Box p={3}>
              <Typography align="center" variant="h5" color="error">
                The link has expired. You can’t fill the form anymore.
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }
  if (alreadyAccepted && !loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          // colored gutters (left/right)
          bgcolor: '#e3edfd', // pick any soft color you like
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          my: { xs: -5, sm: 0 }, // top/bottom breathing room
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', padding: 3 }}>
            <Box p={3}>
              <Typography align="center" variant="h5" color="error">
                You have already accepted the invitation.
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }
  if (!visitorInfo && !loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          // colored gutters (left/right)
          bgcolor: '#e3edfd', // pick any soft color you like
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: { xs: 0, sm: 1 }, // top/bottom breathing room
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', padding: 3 }}>
            <Box sx={{ bgcolor: '#f44242ff', color: '#fff', p: 2 }}>
              <Typography variant="h4" align="center" fontWeight={700}>
                Invitation Not Found
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        // colored gutters (left/right)
        bgcolor: '#e3edfd', // pick any soft color you like
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: { xs: 0, sm: 1 }, // top/bottom breathing room
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', padding: 3 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ bgcolor: '#4285f4', color: '#fff', p: 2 }}>
                <Typography variant="h4" align="center" fontWeight={700}>
                  Invitation Form
                </Typography>
              </Box>
              {visitorInfo && trxVisitorInfo && (
                <Box p={3}>
                  <Typography variant="body1" mb={3} align="center">
                    {visitorInfo.identityId
                      ? `Please review your personal details below. 
               If everything is correct, click Submit. Otherwise, click Edit to update your information.`
                      : `Please proceed to fill the invitation form.`}
                  </Typography>

                  {/* Render the same Invitation Form content regardless */}
                  {/* Replace this with your actual form fields */}
                  {visitorInfo.identityId && (
                    <Box>
                      {/* Personal Info */}
                      <Typography variant="h6" fontWeight={600} mt={2} mb={1}>
                        Personal Info
                      </Typography>
                      <Divider />
                      <TextField
                        id="name"
                        label="Name"
                        fullWidth
                        margin="normal"
                        value={visitorInfo.name}
                        disabled
                      />
                      <TextField
                        id="personId"
                        label="Person ID"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.personId}
                      />
                      <TextField
                        name="identityType"
                        label="Identity Type"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.identityType}
                      />

                      <TextField
                        id="identityId"
                        label="Identity Number"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.identityId}
                      />
                      <TextField
                        id="address"
                        label="Address"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.address}
                      />
                      <TextField
                        id="phone"
                        label="Phone"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.phone}
                      />
                      <TextField
                        name="gender"
                        label="Gender"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.gender}
                      />

                      {/* Extra Info */}
                      <Typography variant="h6" fontWeight={600} mt={3} mb={1}>
                        Extra Info
                      </Typography>
                      <Divider />
                      <TextField
                        id="organizationName"
                        label="Organization"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.organizationName}
                      />
                      <TextField
                        id="departmentName"
                        label="Department"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.departmentName}
                      />
                      <TextField
                        id="districtName"
                        label="District"
                        fullWidth
                        margin="normal"
                        disabled
                        value={visitorInfo.districtName}
                      />

                      {/* Photo */}
                      <Typography variant="h6" fontWeight={600} mt={3} mb={1}>
                        Photo
                      </Typography>
                      <Divider />
                      <Box mt={2}>
                        {preview && (
                          <img
                            src={`${BASE_URL}${preview}`}
                            alt="Preview"
                            style={{ width: '100%', borderRadius: 8, marginTop: 10 }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
              <Box display="flex" justifyContent="space-between" gap={2} mt={3} p={2}>
                {/* Left-most: Decline Invitation */}
                <Button fullWidth variant="contained" color="error" onClick={handleDecline}>
                  Decline Invitation
                </Button>
                {visitorInfo && visitorInfo.identityId ? (
                  <>
                    {/* Center: Edit Form */}
                    <Button fullWidth variant="outlined" color="primary" onClick={goToVisitorForm}>
                      Edit Form
                    </Button>

                    {/* Right: Accept Invitation */}
                    <Button fullWidth variant="contained" color="success" onClick={handleSubmit}>
                      Accept Invitation
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Only Right: Fill Form */}
                    <Button fullWidth variant="contained" color="primary" onClick={goToVisitorForm}>
                      Fill Form
                    </Button>
                  </>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default InvitationInfo;
