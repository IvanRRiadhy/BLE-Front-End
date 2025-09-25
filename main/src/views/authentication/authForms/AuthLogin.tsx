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
  Tabs,
  Tab,
} from '@mui/material';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';

import { loginType } from 'src/types/auth/auth';
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import axiosServices from 'src/utils/axios';
import { useDispatch } from 'src/store/Store';
import { fetchAlarmSettingsDT } from 'src/store/apps/alarmsetting/alarmSettings';
import { defaultAlarmSettingFilter } from 'src/store/apps/defaultForm';

type NativeFormProps = React.ComponentPropsWithoutRef<'form'>;

const MotionForm = motion(
  React.forwardRef<HTMLFormElement, NativeFormProps & MotionProps>(function MF(props, ref) {
    return <form ref={ref} {...props} />;
  }),
);

const ADMIN_API_URL = '/api/Auth/login/'; // existing
const VISITOR_API_URL = '/api/Auth/login/'; // TODO: set your actual visitor endpoint

type TabKey = 'admin' | 'visitor';

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [activeTab, setActiveTab] = useState<TabKey>('admin');
  const [direction, setDirection] = useState(1); // for slide left/right
  const dispatch = useDispatch();
  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [visitorCreds, setVisitorCreds] = useState({ username: '', password: '' }); // keep same fields for now
  const [loginError, setLoginError] = useState<string>('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleTabChange = (_: React.SyntheticEvent, next: TabKey) => {
    setDirection(activeTab === 'admin' && next === 'visitor' ? 1 : -1);
    setActiveTab(next);
    setLoginError('');
  };

  const handleChange = (tab: TabKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginError('');
    if (tab === 'admin') {
      setAdminCreds({ ...adminCreds, [e.target.id]: e.target.value });
    } else {
      setVisitorCreds({ ...visitorCreds, [e.target.id]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const isAdmin = activeTab === 'admin';
    const creds = isAdmin ? adminCreds : visitorCreds;
    const url = isAdmin ? ADMIN_API_URL : VISITOR_API_URL;

    axiosServices
      .post(url, creds)
      .then((res) => {
        const data = res?.data?.collection?.data ?? res?.data;
        // store common things (adjust if visitor payload differs)
        if (data?.token) localStorage.setItem('token', data.token);
        if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data?.applicationId) localStorage.setItem('applicationId', data.applicationId);
        if (data?.levelPriority) localStorage.setItem('levelPriority', data.levelPriority);
        localStorage.setItem('welcomePopupShown', 'false');
        if (isAdmin) {
          
          navigate('/');
        } else {
          navigate('/my-visit');
        }
      })
      .catch((err) => {
        setLoginError('Invalid username or password. Please try again.');
        console.error(
          'error: ',
          err?.response ? err.response.data?.collection.data ?? err.response.data : err?.message,
        );
      });
  };

  const currentCreds = activeTab === 'admin' ? adminCreds : visitorCreds;

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box mt={3}>
        <Divider sx={{ mb: 2 }}>
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

        {/* Top switcher: Admin (top) vs Visitor (bottom) using tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab value="admin" label="Admin" />
          <Tab value="visitor" label="Visitor / Guest" />
        </Tabs>
      </Box>

      {/* Error message */}
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

      {/* Animated form container */}
      <AnimatePresence mode="wait" custom={direction}>
        <MotionForm
          key={activeTab}
          onSubmit={handleSubmit}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Stack>
            <Box>
              <CustomFormLabel htmlFor="username">
                {activeTab === 'admin' ? 'Username' : 'Visitor Username'}
              </CustomFormLabel>
              <CustomTextField
                id="username"
                variant="outlined"
                fullWidth
                value={currentCreds.username}
                onChange={handleChange(activeTab)}
              />
            </Box>
            <Box>
              <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
              <CustomTextField
                id="password"
                type="password"
                variant="outlined"
                fullWidth
                value={currentCreds.password}
                onChange={handleChange(activeTab)}
              />
            </Box>

            <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
              <FormGroup>
                <FormControlLabel
                  control={<CustomCheckbox defaultChecked />}
                  label="Remember this Device"
                />
              </FormGroup>
              <Typography
                component={Link}
                to="/auth/forgot-password"
                fontWeight="500"
                sx={{ textDecoration: 'none', color: 'primary.main' }}
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
            <Button color="primary" variant="contained" size="large" fullWidth type="submit">
              {activeTab === 'admin' ? 'Sign In as Admin' : 'Sign In as Visitor'}
            </Button>
          </Box>
        </MotionForm>
      </AnimatePresence>

      {subtitle}
    </>
  );
};

export default AuthLogin;
