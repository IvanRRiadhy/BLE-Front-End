import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

import gedung from 'src/assets/images/backgrounds/gedung-bi.png';
import logo from 'src/assets/images/logos/BI_Logo.png';
import bg from 'src/assets/images/backgrounds/bg.jpg';
import Footer from 'src/layouts/Footer';
import AuthLogin from '../authForms/AuthLogin';

const Login = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkExistingLogin = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setCheckingAuth(false);
      return;
    }
    const levelPriority = localStorage.getItem('levelPriority');

    window.location.href =
      levelPriority === 'Primary' ? '/security-view/dashboard' : '/dashboards/newmainmenu';
    // setCheckingAuth(false);
    // try {
    //   const res = await axiosServices.get('/api/Auth/me', {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //     },
    //   });

    //   const data = res?.data?.collection?.data ?? res?.data;
    //   // console.log
    //   if (data) {

    //   }
    // } catch (err) {
    //   // token invalid → clear
    //   localStorage.removeItem('token');
    //   localStorage.removeItem('refreshToken');
    // }
  };
  useEffect(() => {
    checkExistingLogin();
  }, []);

  if (checkingAuth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="Login" description="Login page">
      {/* PAGE WRAPPER */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* LOGIN CONTENT */}
        <Box
          sx={{
            flex: 1, // 👈 pushes footer to bottom
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
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
                Bank Indonesia - Di Setiap Makna Indonesia
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  opacity: 0.9,
                }}
              >
                Indonesia adalah Bank Sentral Republik Indonesia dengan Satu Tujuan Tunggal yaitu
                Mencapai dan Memelihara Kestabilan Nilai Rupiah.
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

              <AuthLogin title="Sign in" />
            </Box>
          </Paper>
        </Box>

        {/* FOOTER */}
        <Footer />
      </Box>
    </PageContainer>
  );
};

export default Login;
