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
  Grid2 as Grid,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { fetchVisitorbyId, fillFormVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import { AppDispatch, dispatch, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import { BASE_URL } from 'src/utils/axios';
import { IdentityType } from 'src/types/crud/input';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const VisitorFormPage = () => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const query = useQuery();
  const code = query.get('code');
  const applicationId = query.get('applicationId');
  const visitorId = query.get('visitorId');
  const trxVisitorId = query.get('trxVisitorId');
  const [visitorInfo, setVisitorInfo] = useState<VisitorType | null>(null);

  useEffect(() => {
    if (visitorId) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const data = await dispatch(fetchVisitorbyId(visitorId));
          if (data) {
            setVisitorInfo(data);
            setFormData((prev) => ({ ...prev, ...sanitizeVisitorData(data) }));
            setPreview(data?.faceImage || null);
            setFormErrors({});
          }
        } catch (err) {
          toast.error('Failed to load visitor data');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    personId: '',
    address: '',
    phone: '',
    identityType: '',
    identityId: '',
    gender: '',
    organizationName: '',
    departmentName: '',
    districtName: '',
    faceImage: null as File | null,
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const identityTypes = [
    { value: 'ktp', label: 'KTP' },
    { value: 'sim', label: 'SIM' },
    { value: 'passport', label: 'Passport' },
  ];

  const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ];

  const sanitizeVisitorData = (data: VisitorType) => ({
    name: data.name || '',
    personId: data.personId || '',
    address: data.address || '',
    phone: data.phone || '',
    identityType: (data.identityType || '').toLowerCase(), // ensure it matches select values
    identityId: data.identityId || '',
    gender: (data.gender || '').toLowerCase(),
    organizationName: data.organizationName || '',
    departmentName: data.departmentName || '',
    districtName: data.districtName || '',
    faceImage: null, // Do not set the string path here
  });

  const handleInputChange = (e: any) => {
    const { id, name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id || name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, faceImage: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Full name is required';
    if (!formData.identityType?.trim()) errors.identityType = 'Identity Type is required';
    if (!formData.identityId?.trim()) errors.identityId = 'Identity ID is required';
    if (!formData.faceImage) errors.faceImage = 'Photo is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setIsSaving(true);
    setLoading(true);
    // Prepare FormData
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
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
      if (result && result.msg && result.msg.endsWith('successfully')) {
        navigate('/thank-you');
        toast.success('Submitted successfully!');
        setFormData({
          name: '',
          personId: '',
          address: '',
          phone: '',
          identityType: '',
          identityId: '',
          gender: '',
          organizationName: '',
          departmentName: '',
          districtName: '',
          faceImage: null,
        });
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
      {/* Limit width so it always looks like mobile on desktop */}
      <Container maxWidth="sm" disableGutters>
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Top accent header like Google Forms */}
          <Box sx={{ bgcolor: '#4285f4', color: '#fff', p: 2 }}>
            <Typography variant="h4" align="center" fontWeight={700}>
              Visitor Registration
            </Typography>
          </Box>

          {/* Form body */}
          <Box
            sx={{
              p: { xs: 2, sm: 3 }, // responsive padding
              pointerEvents: loading || isSaving ? 'none' : 'auto',
              opacity: loading || isSaving ? 0.6 : 1,
              backgroundColor: 'background.paper',
            }}
          >
            {/* Personal Info */}
            <Typography variant="h6" fontWeight={600} mt={2} mb={1}>
              Personal Info
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={{ xs: 0, sm: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 1, sm: 1 }}>
                <TextField
                  id="name"
                  label="Full Name"
                  fullWidth
                  margin="normal"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 2, sm: 2 }}>
                <TextField
                  select
                  name="identityType"
                  label="Identity Type"
                  fullWidth
                  margin="normal"
                  value={formData.identityType || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.identityType}
                  helperText={formErrors.identityType}
                >
                  {IdentityType.map((item) => (
                    <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                      {item.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 4, sm: 3 }}>
                <TextField
                  id="address"
                  label="Address"
                  fullWidth
                  margin="normal"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 3, sm: 4 }}>
                <TextField
                  id="identityId"
                  label="Identity Number"
                  fullWidth
                  margin="normal"
                  value={formData.identityId}
                  onChange={handleInputChange}
                  disabled={!formData.identityType}
                  error={!!formErrors.identityId}
                  helperText={formErrors.identityId}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 5, sm: 5 }}>
                <TextField
                  id="phone"
                  label="Phone"
                  fullWidth
                  margin="normal"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 6, sm: 6 }}>
                <TextField
                  select
                  name="gender"
                  label="Gender"
                  fullWidth
                  margin="normal"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                >
                  {genders.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Extra Info */}
            <Typography variant="h6" fontWeight={600} mt={3} mb={1}>
              Extra Info
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={{ xs: 0, sm: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 1, sm: 1 }}>
                <TextField
                  id="personId"
                  label="Person ID"
                  fullWidth
                  margin="normal"
                  value={formData.personId}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 2, sm: 2 }}>
                <TextField
                  id="organizationName"
                  label="Organization"
                  fullWidth
                  margin="normal"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 3, sm: 3 }}>
                <TextField
                  id="departmentName"
                  label="Department"
                  fullWidth
                  margin="normal"
                  value={formData.departmentName}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} order={{ xs: 4, sm: 4 }}>
                <TextField
                  id="districtName"
                  label="District"
                  fullWidth
                  margin="normal"
                  value={formData.districtName}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>

            {/* Photo */}
            <Typography variant="h6" fontWeight={600} mt={3} mb={1}>
              Photo
            </Typography>
            <Divider />
            <Box mt={2}>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {formErrors.faceImage && (
                <FormHelperText error>{formErrors.faceImage}</FormHelperText>
              )}
              {preview && (
                <img
                  src={preview.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
                  alt="Preview"
                  style={{ width: '100%', borderRadius: 8, marginTop: 10 }}
                />
              )}
            </Box>

            {/* Submit */}
            <Box mt={3}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={isSaving}
                sx={{
                  py: 1.25,
                  borderRadius: 2,
                  backgroundColor: '#4285f4', // override the background color
                  '&:hover': {
                    backgroundColor: '#4285f4', // override the hover background color
                  },
                }}
              >
                {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default VisitorFormPage;
