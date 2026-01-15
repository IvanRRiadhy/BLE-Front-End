import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

import gedung from 'src/assets/images/backgrounds/gedung-bi.png';
import logo from 'src/assets/images/logos/BI_Logo.png';
import bg from 'src/assets/images/backgrounds/bg.jpg';

import AuthLogin from '../authForms/AuthLogin';

const Login = () => {
  return (
    <PageContainer title="Login" description="Login page">
      {/* Background */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        {/* Card */}
        <Paper
          elevation={8}
          sx={{
            width: '100%',
            maxWidth: '72rem',
            minHeight: '36rem',
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* LEFT PANEL */}
          <Box
            sx={{
              flex: 1,
              backgroundColor: '#045498',
              color: '#f3f4f6',
              p: { xs: 3, md: 5 },
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box
              component="img"
              src={gedung}
              alt="Gedung BI"
              sx={{
                maxWidth: '100%',
                maxHeight: 320,
                borderRadius: 3,
                objectFit: 'contain',
              }}
            />

            <Typography variant="h4" fontWeight={700}>
              Lorem Ipsum
            </Typography>

            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                opacity: 0.9,
              }}
            >
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
              eget pulvinar nibh. Donec ut arcu in erat auctor gravida.
            </Typography>
          </Box>

          {/* RIGHT PANEL */}
          <Box
            sx={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 3, md: 5 },
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="Logo BI"
              sx={{
                width: '40%',
                maxWidth: 200,
                mb: 2,
              }}
            />

            {/* Existing login logic */}
            <AuthLogin title="Sign in" />
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default Login;
