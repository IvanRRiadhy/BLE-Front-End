// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { Link, useNavigate } from 'react-router';

import { loginType } from 'src/types/auth/auth';
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';

import AuthSocialButtons from './AuthSocialButtons';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { dispatch } from 'src/store/Store';
import axiosServices from 'src/utils/axios';

const API_URL = '/api/Auth/login/';
const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string>('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loginError) {
      setLoginError('');
    }
    setCredentials({ ...credentials, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log(credentials);
    axiosServices
      .post(API_URL, credentials)
      .then((res) => {
        const data = res.data.collection.data;
        console.log('Data: ', data);
        console.log('Username: ', data.username);
        console.log('JWT Token: ', data.token);
        console.log('Refresh Token: ', data.refreshToken);
        console.log('User Role: ', data.groupId);

        localStorage.setItem('token', data.token);
        localStorage.setItem('welcomePopupShown', 'false');
        localStorage.setItem('refreshToken', data.refreshToken);
        navigate('/');
      })
      .catch((error) => {
        setLoginError('Invalid username or password. Please try again.');
        console.error('error: ', error.response ? error.response.data.collection : error.message);
      });
    // axios
    //   .post(API_URL, credentials)
    //   .then((res) => {
    //     const data = res.data.collection.data;
    //     console.log('Data: ', data);
    //     console.log('Username: ', data.username);
    //     console.log('JWT Token: ', data.token);
    //     console.log('Refresh Token: ', data.refreshToken);
    //     console.log('User Role: ', data.groupId);

    //     localStorage.setItem('token', data.token);
    //     localStorage.setItem('welcomePopupShown', 'false');
    //     localStorage.setItem('refreshToken', data.refreshToken);
    //     navigate('/');
    //   })
    //   .catch((error) => {
    //     setLoginError('Invalid username or password. Please try again.');
    //     console.error('error: ', error.response ? error.response.data.collection : error.message);
    //   });
  };
  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box mt={3}>
        <Divider>
          <Typography
            component="span"
            color="textSecondary"
            variant="h6"
            fontWeight="400"
            position="relative"
            px={2}
          >
            Sign in
          </Typography>
        </Divider>
      </Box>
      {/* Error message display */}
      {loginError && (
        <Box mt={2}>
          <Typography
            variant="body2"
            color="error"
            textAlign="center"
            sx={{
              backgroundColor: '#ffebee',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ffcdd2',
            }}
          >
            {loginError}
          </Typography>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <Stack>
          <Box>
            <CustomFormLabel htmlFor="username">Username</CustomFormLabel>
            <CustomTextField
              id="username"
              variant="outlined"
              fullWidth
              value={credentials.username}
              onChange={handleChange}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
            <CustomTextField
              id="password"
              type="password"
              variant="outlined"
              fullWidth
              value={credentials.password}
              onChange={handleChange}
            />
          </Box>
          <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
            <FormGroup>
              <FormControlLabel
                control={<CustomCheckbox defaultChecked />}
                label="Remeber this Device"
              />
            </FormGroup>
            <Typography
              component={Link}
              to="/auth/forgot-password"
              fontWeight="500"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
              }}
            >
              Forgot Password ?
            </Typography>
          </Stack>
        </Stack>
        {error && (
          <Typography color="error" mb={2}>
            {error}
          </Typography>
        )}
        <Box>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            // component={Link}
            // to="/"
            type="submit"
          >
            Sign In
          </Button>
        </Box>
      </form>

      {subtitle}
    </>
  );
};

export default AuthLogin;
