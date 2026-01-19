// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Link } from 'react-router';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';

import { loginType } from 'src/types/auth/auth';
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import axiosServices from 'src/utils/axios';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

type NativeFormProps = React.ComponentPropsWithoutRef<'form'>;

const MotionForm = motion(
  React.forwardRef<HTMLFormElement, NativeFormProps & MotionProps>((props, ref) => (
    <form ref={ref} {...props} />
  )),
);

const ADMIN_API_URL = '/api/Auth/login';
const VISITOR_API_URL = '/api/Auth/login';

type TabKey = 'admin' | 'visitor';

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [activeTab, setActiveTab] = useState<TabKey>('admin');
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [visitorCreds, setVisitorCreds] = useState({ username: '', password: '' });

  const usernameRef = useRef<HTMLInputElement>(null);

  const isAdmin = activeTab === 'admin';
  const creds = isAdmin ? adminCreds : visitorCreds;

  const handleTabChange = (_: React.SyntheticEvent, next: TabKey) => {
    setDirection(activeTab === 'admin' && next === 'visitor' ? 1 : -1);
    setActiveTab(next);
    setLoginError('');
  };

  const handleChange =
    (tab: TabKey, field: 'username' | 'password') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoginError('');
      tab === 'admin'
        ? setAdminCreds((prev) => ({ ...prev, [field]: e.target.value }))
        : setVisitorCreds((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const url = isAdmin ? ADMIN_API_URL : VISITOR_API_URL;

    try {
      const res = await axiosServices.post(url, creds);
      const data = res?.data?.collection?.data ?? res?.data;

      if (data?.token) localStorage.setItem('token', data.token);
      if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data?.applicationId) localStorage.setItem('applicationId', data.applicationId);
      if (data?.levelPriority) {
        localStorage.setItem('levelPriority', data.levelPriority.trim());
      }

      localStorage.setItem('response', JSON.stringify(data));
      localStorage.setItem('welcomePopupShown', 'false');

      setTimeout(() => {
        window.location.href = isAdmin ? '/dashboards/newmainmenu' : '/my-visit';
      }, 300);
    } catch (err) {
      setLoginError('Invalid username or password. Please try again.');

      isAdmin
        ? setAdminCreds({ username: '', password: '' })
        : setVisitorCreds({ username: '', password: '' });

      // UX: refocus username
      requestAnimationFrame(() => {
        usernameRef.current?.focus();
      });
    }
  };

  return (
    <>
      {title && (
        <Typography fontWeight={700} variant="h3" mb={1}>
          {title}
        </Typography>
      )}

      {subtext}

      <Box mt={3}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
        >
          <Tab value="admin" label="Admin" />
          <Tab value="visitor" label="Visitor / Guest" />
        </Tabs>
      </Box>

      {loginError && (
        <Typography
          variant="body2"
          color="error"
          textAlign="center"
          sx={{
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: 1,
            p: 1,
            mb: 2,
          }}
        >
          {loginError}
        </Typography>
      )}

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
          <Stack spacing={2}>
            <Box>
              <CustomFormLabel htmlFor="username">
                {isAdmin ? 'Username' : 'Visitor Username'}
              </CustomFormLabel>
              <CustomTextField
                id="username"
                fullWidth
                inputRef={usernameRef}
                value={creds.username}
                onChange={handleChange(activeTab, 'username')}
              />
            </Box>

            <Box>
              <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
              <CustomTextField
                id="password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={creds.password}
                onChange={handleChange(activeTab, 'password')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((p) => !p)}>
                        {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <FormGroup>
                <FormControlLabel
                  control={<CustomCheckbox defaultChecked />}
                  label="Remember this Device"
                />
              </FormGroup>

              <Typography
                component={Link}
                to="/auth/forgot-password"
                fontWeight={500}
                sx={{ textDecoration: 'none', color: 'primary.main' }}
              >
                Forgot Password ?
              </Typography>
            </Stack>

            <Button type="submit" fullWidth size="large" variant="contained">
              {isAdmin ? 'Sign In as Admin' : 'Sign In as Visitor'}
            </Button>
          </Stack>
        </MotionForm>
      </AnimatePresence>

      {subtitle}
    </>
  );
};

export default AuthLogin;
