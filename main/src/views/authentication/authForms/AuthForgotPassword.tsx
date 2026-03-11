// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import React from 'react';
// import { Button, Stack } from '@mui/material';
// import { Link } from 'react-router';

// import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
// import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';

// const AuthForgotPassword = () => (
//   <>
//     <Stack mt={4} spacing={2}>
//       <CustomFormLabel htmlFor="reset-email">Email Adddress</CustomFormLabel>
//       <CustomTextField id="reset-email" variant="outlined" fullWidth />

//       <Button color="primary" variant="contained" size="large" fullWidth component={Link} to="/">
//         Forgot Password
//       </Button>
//       <Button color="primary" size="large" fullWidth component={Link} to="/auth/login">
//         Back to Login
//       </Button>
//     </Stack>
//   </>
// );

// export default AuthForgotPassword;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { Box, Typography, Button, Stack, Tabs, Tab, CircularProgress } from '@mui/material';
import { Link } from 'react-router';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';

import { loginType } from 'src/types/auth/auth';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import axiosServices from 'src/utils/axios';

type NativeFormProps = React.ComponentPropsWithoutRef<'form'>;

const MotionForm = motion(
  React.forwardRef<HTMLFormElement, NativeFormProps & MotionProps>((props, ref) => (
    <form ref={ref} {...props} />
  )),
);

const API_URL = '/api/Auth/forgot-password';

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

const AuthForgotPassword = ({ title, subtitle, subtext }: loginType) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await axiosServices.post(API_URL, { email });
      console.log(res);
      setMessage('If the email is registered, a password reset link will be sent.');
      setEmail('');
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
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
          value="forgot"
          variant="fullWidth"
          sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
        >
          <Tab value="forgot" label="Forgot Password" />
        </Tabs>
      </Box>

      {error && (
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
          {error}
        </Typography>
      )}

      {message && (
        <Typography
          variant="body2"
          textAlign="center"
          sx={{
            backgroundColor: '#e8f5e9',
            border: '1px solid #c8e6c9',
            borderRadius: 1,
            p: 1,
            mb: 2,
          }}
        >
          {message}
        </Typography>
      )}

      <AnimatePresence mode="wait">
        <MotionForm
          key="forgot"
          onSubmit={handleSubmit}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Stack spacing={2}>
            <Box>
              <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
              <CustomTextField
                id="email"
                type="email"
                fullWidth
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </Box>

            <Button type="submit" fullWidth size="large" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
            </Button>

            <Typography
              component={Link}
              to="/auth/login"
              textAlign="center"
              sx={{ textDecoration: 'none', color: 'primary.main', mt: 1 }}
            >
              Back to Login
            </Typography>
          </Stack>
        </MotionForm>
      </AnimatePresence>

      {subtitle}
    </>
  );
};

export default AuthForgotPassword;
