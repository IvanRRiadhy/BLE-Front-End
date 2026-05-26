// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useRef, useEffect } from 'react';
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
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { Link } from 'react-router';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import { loginType } from 'src/types/auth/auth';
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import axiosServices from 'src/utils/axios';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import _ from 'lodash';
import { baselightTheme } from 'src/theme/DefaultColors';
import typography from 'src/theme/Typography';
import { shadows } from 'src/theme/Shadows';
import components from 'src/theme/Components';

type NativeFormProps = React.ComponentPropsWithoutRef<'form'>;

type JwtPayload = {
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': string;
  fullName: string;
  groupId: string;
  ApplicationId: string;
  groupName: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  level: string;
  isHead: string;
  accessibleBuildings: string;
  exp: number;
};

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

const baseMode: any = {
  palette: {
    mode: 'light',
  },
  shape: {
    borderRadius: 7,
  },
  shadows: shadows,
  typography: typography,
};

const loginTheme = createTheme(_.merge({}, baseMode, baselightTheme));
loginTheme.components = components(loginTheme);

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [activeTab, setActiveTab] = useState<TabKey>('admin');
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [visitorCreds, setVisitorCreds] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);

  const usernameRef = useRef<HTMLInputElement>(null);

  // ✅ Auto-fill remembered usernames on mount
  useEffect(() => {
    const savedAdmin = localStorage.getItem('rememberedAdminUsername');
    const savedVisitor = localStorage.getItem('rememberedVisitorUsername');
    const savedRememberMe = localStorage.getItem('rememberMePreference');
    const savedLoginMode = localStorage.getItem('rememberedLoginMode') as TabKey | null;

    if (savedAdmin) {
      setAdminCreds((prev) => ({ ...prev, username: savedAdmin }));
    }
    if (savedVisitor) {
      setVisitorCreds((prev) => ({ ...prev, username: savedVisitor }));
    }
    if (savedRememberMe !== null) {
      setRememberMe(savedRememberMe === 'true');
    }
    if (savedLoginMode && (savedLoginMode === 'admin' || savedLoginMode === 'visitor')) {
      setActiveTab(savedLoginMode);
    }
  }, []);

  const isAdmin = activeTab === 'admin';
  const creds = isAdmin ? adminCreds : visitorCreds;

  const handleTabChange = (_: React.SyntheticEvent, next: TabKey) => {
    setDirection(activeTab === 'admin' && next === 'visitor' ? 1 : -1);
    setActiveTab(next);
    setLoginError('');
  };

  const handleChange =
    (tab: TabKey, field: 'username' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoginError('');
      tab === 'admin'
        ? setAdminCreds((prev) => ({ ...prev, [field]: e.target.value }))
        : setVisitorCreds((prev) => ({ ...prev, [field]: e.target.value }));
    };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoginError('');

  //   const url = isAdmin ? ADMIN_API_URL : VISITOR_API_URL;

  //   try {
  //     const res = await axiosServices.post(url, creds);
  //     const data = res?.data?.collection?.data ?? res?.data;

  //     if (data?.token) localStorage.setItem('token', data.token);
  //     if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  //     if (data?.applicationId) localStorage.setItem('applicationId', data.applicationId);
  //     if (data?.levelPriority) {
  //       localStorage.setItem('levelPriority', data.levelPriority.trim());
  //     }
  //     if (data?.username) localStorage.setItem('username', data.username);
  //     if (data?.email) localStorage.setItem('email', data.email);

  //     localStorage.setItem('response', JSON.stringify(data));
  //     localStorage.setItem('welcomePopupShown', 'false');
  //     if (isAdmin && data.levelPriority === 'Primary') {
  //       setLoginError('You do not have permission to login as Admin');
  //       return;
  //     }

  //     setTimeout(() => {
  //       window.location.href = isAdmin
  //         ? '/dashboards/newmainmenu'
  //         : data.levelPriority === 'Primary'
  //           ? '/security-view/dashboard'
  //           : '/my-visit';
  //       console.log('data', data);
  //     }, 300);
  //   } catch (err) {
  //     setLoginError('Invalid username or password. Please try again.');

  //     isAdmin
  //       ? setAdminCreds({ username: '', password: '' })
  //       : setVisitorCreds({ username: '', password: '' });

  //     // UX: refocus username
  //     requestAnimationFrame(() => {
  //       usernameRef.current?.focus();
  //     });
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const url = isAdmin ? ADMIN_API_URL : VISITOR_API_URL;

    try {
      const res = await axiosServices.post(url, creds);
      const data = res?.data?.collection?.data ?? res?.data;

      if (data?.token) {
        localStorage.setItem('token', data.token);

        // ✅ decode JWT
        const decoded = jwtDecode<JwtPayload>(data.token);

        // mapping from JWT
        const username = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
        const levelPriority =
          decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const applicationId = decoded['ApplicationId'];

        // save to localStorage
        if (username) localStorage.setItem('username', username);
        if (email) localStorage.setItem('email', email);
        if (levelPriority) localStorage.setItem('levelPriority', levelPriority.trim());
        if (applicationId && levelPriority.trim() !== 'System')
          localStorage.setItem('applicationId', applicationId);

        // optional extras
        if (decoded.fullName) localStorage.setItem('fullName', decoded.fullName);
        if (decoded.groupName) localStorage.setItem('groupName', decoded.groupName);
        // handle accessibleBuildings (comma-separated string → array)
        if (decoded.accessibleBuildings) {
          const buildingsArray = decoded.accessibleBuildings
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean); // remove empty values

          localStorage.setItem('accessibleBuildings', JSON.stringify(buildingsArray));
        }

        // ✅ Handle "Remember this Device" logic
        if (rememberMe) {
          if (isAdmin) {
            localStorage.setItem('rememberedAdminUsername', creds.username);
          } else {
            localStorage.setItem('rememberedVisitorUsername', creds.username);
          }
          localStorage.setItem('rememberMePreference', 'true');
          localStorage.setItem('rememberedLoginMode', activeTab);
        } else {
          localStorage.removeItem('rememberedAdminUsername');
          localStorage.removeItem('rememberedVisitorUsername');
          localStorage.removeItem('rememberedLoginMode');
          localStorage.setItem('rememberMePreference', 'false');
        }
      }

      if (data?.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      localStorage.setItem('response', JSON.stringify(data));
      localStorage.setItem('welcomePopupShown', 'false');

      // ❗ IMPORTANT: use decoded role instead of data.levelPriority
      const role = jwtDecode<JwtPayload>(data.token)[
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      ];

      if (isAdmin && role === 'Primary') {
        setLoginError('You do not have permission to login as Admin');
        return;
      }

      setTimeout(() => {
        window.location.href = isAdmin
          ? '/dashboards/newmainmenu'
          : role === 'Primary'
            ? '/security-view/dashboard'
            : '/my-visit';

        console.log('decoded', jwtDecode(data.token));
      }, 300);
    } catch (err) {
      setLoginError('Invalid username or password. Please try again.');

      isAdmin
        ? setAdminCreds({ username: '', password: '' })
        : setVisitorCreds({ username: '', password: '' });

      requestAnimationFrame(() => {
        usernameRef.current?.focus();
      });
    }
  };

  return (
    <ThemeProvider theme={loginTheme}>
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
          <Tab value="visitor" label="Security" />
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
                  control={
                    <CustomCheckbox
                      checked={rememberMe}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRememberMe(e.target.checked)
                      }
                    />
                  }
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
    </ThemeProvider>
  );
};

export default AuthLogin;
