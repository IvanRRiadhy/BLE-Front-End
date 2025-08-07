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
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchVisitorbyId, fillFormVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import { AppDispatch, dispatch, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';

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
  useEffect(() => {
    console.log(visitorInfo);
  }, [visitorInfo]);
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

  const handleSubmit = async () => {
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

      await dispatch(
        fillFormVisitor({
          code: code || '',
          visitorId: visitorId || '',
          applicationId: applicationId || '',
          trxVisitorId: trxVisitorId || '',
          formData: data,
        }),
      ).unwrap();
      toast.success('Submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit!');
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        setLoading(false);
        navigate('/thank-you');
      }, 1500);

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
    }
  };

  return (
    <>
      <Box
        sx={{
          maxWidth: '600px',
          mx: 'auto',
          p: 5,
          pointerEvents: loading || isSaving ? 'none' : 'auto',
          opacity: loading || isSaving ? 0.5 : 1,
        }}
      >
        <Typography variant="h5" fontWeight={700} mb={2} align="center">
          Visitor Registration
        </Typography>

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
          value={formData.name}
          onChange={handleInputChange}
        />
        <TextField
          id="personId"
          label="Person ID"
          fullWidth
          margin="normal"
          value={formData.personId}
          onChange={handleInputChange}
        />
        <TextField
          select
          name="identityType"
          label="Identity Type"
          fullWidth
          margin="normal"
          value={formData.identityType || ''}
          onChange={handleInputChange}
        >
          {identityTypes.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="identityId"
          label="Identity Number"
          fullWidth
          margin="normal"
          value={formData.identityId}
          onChange={handleInputChange}
          disabled={!formData.identityType}
        />
        <TextField
          id="address"
          label="Address"
          fullWidth
          margin="normal"
          value={formData.address}
          onChange={handleInputChange}
        />
        <TextField
          id="phone"
          label="Phone"
          fullWidth
          margin="normal"
          value={formData.phone}
          onChange={handleInputChange}
        />
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
          value={formData.organizationName}
          onChange={handleInputChange}
        />
        <TextField
          id="departmentName"
          label="Department"
          fullWidth
          margin="normal"
          value={formData.departmentName}
          onChange={handleInputChange}
        />
        <TextField
          id="districtName"
          label="District"
          fullWidth
          margin="normal"
          value={formData.districtName}
          onChange={handleInputChange}
        />

        {/* Photo */}
        <Typography variant="h6" fontWeight={600} mt={3} mb={1}>
          Photo
        </Typography>
        <Divider />
        <Box mt={2}>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              style={{ width: '100%', borderRadius: 8, marginTop: 10 }}
            />
          )}
        </Box>

        {/* Submit */}
        <Box mt={4} mb={2} textAlign="center">
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaving}
            sx={{ width: '100%', py: 1.5, fontSize: '1rem' }}
          >
            {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
          </Button>
        </Box>
      </Box>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 9999 }}
        open={loading || isSaving}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};

export default VisitorFormPage;
