import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Box, CircularProgress, Paper, Typography, ThemeProvider, createTheme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { getConfig } from 'src/config';

import bg from 'src/assets/images/backgrounds/bg.jpg';
import Footer from 'src/layouts/Footer';
import AuthLogin from '../authForms/AuthLogin';
import _ from 'lodash';
import { baselightTheme } from 'src/theme/DefaultColors';
import typography from 'src/theme/Typography';
import { shadows } from 'src/theme/Shadows';
import components from 'src/theme/Components';

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

const Login = () => {
  const logo = getConfig().LOGO_URL || '/Logo_Bionics.png';
  const gedung = getConfig().GEDUNG_IMG_URL || '/gedung-utama.jpg';
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginText, setLoginText] = useState({
    title: 'Bionic - ',
    description:
      'Indonesia adalah Bank Sentral Republik Indonesia dengan Satu Tujuan Tunggal yaitu Mencapai dan Memelihara Kestabilan Nilai Rupiah.',
  });

  useEffect(() => {
    fetch('/LoginText_BI.json')
      .then((res) => res.json())
      .then((data) => {
        if (data.title && data.description) {
          setLoginText({
            title: data.title,
            description: data.description,
          });
        }
      })
      .catch((err) => console.error('Error loading login text:', err));
  }, []);

  const checkExistingLogin = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    // 🔹 Read levelPriority from localStorage, fallback to JWT decode if missing
    let levelPriority = localStorage.getItem('levelPriority');
    if (!levelPriority) {
      try {
        const decoded: any = jwtDecode(token);
        const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        levelPriority = role ? role.trim() : null;
        if (levelPriority) localStorage.setItem('levelPriority', levelPriority);
      } catch {
        // invalid token → let user log in fresh
        localStorage.removeItem('token');
        setCheckingAuth(false);
        return;
      }
    }

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
    <ThemeProvider theme={loginTheme}>
      <PageContainer title="Login" description="Login page">
        {/* PAGE WRAPPER */}
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fff', // 👈 Force background to white
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
                bgcolor: '#fff', // 👈 Force paper to white
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
                  {loginText.title}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    opacity: 0.9,
                  }}
                >
                  {loginText.description}
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
    </ThemeProvider>
  );
};

export default Login;
