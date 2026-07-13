// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// import React from 'react';
// import { Grid2 as Grid, Box, Typography } from '@mui/material';

// import Logo from 'src/layouts/full/shared/logo/Logo';
// import PageContainer from 'src/components/container/PageContainer';

// import img1 from 'src/assets/images/backgrounds/login-bg.svg';

// import AuthForgotPassword from '../authForms/AuthForgotPassword';

// const ForgotPassword = () => (
//   <PageContainer title="Forgot Password" description="this is Forgot Password page">
//     <Grid container justifyContent="center" spacing={0} sx={{ overflowX: 'hidden' }}>
//       <Grid
//         sx={{
//           position: 'relative',
//           '&:before': {
//             content: '""',
//             background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
//             backgroundSize: '400% 400%',
//             animation: 'gradient 15s ease infinite',
//             position: 'absolute',
//             height: '100%',
//             width: '100%',
//             opacity: '0.3',
//           },
//         }}
//         size={{
//           xs: 12,
//           sm: 12,
//           lg: 8,
//           xl: 9
//         }}>
//         <Box position="relative">
//           <Box px={3}>
//             <Logo />
//           </Box>
//           <Box
//             alignItems="center"
//             justifyContent="center"
//             height={'calc(100vh - 75px)'}
//             sx={{
//               display: {
//                 xs: 'none',
//                 lg: 'flex',
//               },
//             }}
//           >
//             <img
//               src={img1}
//               alt="bg"
//               style={{
//                 width: '100%',
//                 maxWidth: '500px',
//               }}
//             />
//           </Box>
//         </Box>
//       </Grid>
//       <Grid
//         display="flex"
//         justifyContent="center"
//         alignItems="center"
//         size={{
//           xs: 12,
//           sm: 12,
//           lg: 4,
//           xl: 3
//         }}>
//         <Box p={4}>
//           <Typography variant="h4" fontWeight="700">
//             Forgot your password?
//           </Typography>

//           <Typography color="textSecondary" variant="subtitle2" fontWeight="400" mt={2}>
//             Please enter the email address associated with your account and We will email you a link
//             to reset your password.
//           </Typography>
//           <AuthForgotPassword />
//         </Box>
//       </Grid>
//     </Grid>
//   </PageContainer>
// );

// export default ForgotPassword;
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { getConfig } from 'src/config';

import bg from 'src/assets/images/backgrounds/bg.jpg';
import Footer from 'src/layouts/Footer';
import AuthForgotPassword from '../authForms/AuthForgotPassword';

const ForgotPassword = () => {
  const logo = getConfig().LOGO_URL || '/Logo_Bionics.png';
  const gedung = getConfig().GEDUNG_IMG_URL || '/gedung-utama.jpg';
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

              <AuthForgotPassword title="Sign in" />
            </Box>
          </Paper>
        </Box>

        {/* FOOTER */}
        <Footer />
      </Box>
    </PageContainer>
  );
};

export default ForgotPassword;
