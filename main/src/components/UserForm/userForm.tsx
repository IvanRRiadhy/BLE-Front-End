import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Container,
  Paper,
  Grid2 as Grid,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { InputAdornment, IconButton } from '@mui/material';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import axiosServices from 'src/utils/axios';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};
const confirm_URL = '/api/Auth/confirm-account';
const reset_URL = '/api/Auth/reset-password';

const UserForm = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const type = query.get('type'); // confirm | reset
  const token = query.get('token');
  const emailQuery = query.get('email');

  const [email, setEmail] = useState(emailQuery || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const title = type === 'reset' ? 'Reset Password' : 'Confirm Registration';

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    if (!password) {
      toast.error('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password does not match');
      return;
    }
    if (!token) {
      console.error('Token is required');
      toast.error('Token not found');
      return;
    }
    console.log('token', token);
    try {
      setLoading(true);
      let payload = {};
      if (type === 'reset') {
        payload = {
          resetToken: token,
          email,
          password,
          confirmPassword,
        };
      } else {
        payload = {
          token: token,
          email,
          password,
          confirmPassword,
        };
      }
      const res = await axiosServices.post(type === 'reset' ? reset_URL : confirm_URL, payload);
      // TODO: call your API here
      // await axios.post(...)
      console.log('res', res);
      toast.success(type === 'reset' ? 'Password successfully reset' : 'Registration confirmed');

      navigate('/login');
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#e3edfd',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        py: { xs: 0, sm: 1 },
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{ bgcolor: '#4285f4', color: '#fff', p: 2 }}>
            <Typography variant="h4" align="center" fontWeight={700}>
              {title}
            </Typography>
          </Box>

          {/* Form */}
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              opacity: loading ? 0.6 : 1,
              pointerEvents: loading ? 'none' : 'auto',
            }}
          >
            <Typography variant="h6" fontWeight={600} mt={2} mb={1}>
              Account Information
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={{ xs: 0, sm: 2 }}>
              <Grid size={12}>
                <TextField
                  label="Email"
                  fullWidth
                  margin="normal"
                  value={email}
                  disabled={!!emailQuery}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>

            {/* Submit */}
            <Box mt={3}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                sx={{
                  py: 1.25,
                  borderRadius: 2,
                  backgroundColor: '#4285f4',
                  '&:hover': {
                    backgroundColor: '#4285f4',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : type === 'reset' ? (
                  'Reset Password'
                ) : (
                  'Confirm Registration'
                )}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default UserForm;
