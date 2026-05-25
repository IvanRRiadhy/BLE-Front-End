import { Typography } from '@mui/material';
import { Box, Container, Stack } from '@mui/system';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconBrandYoutube,
} from '@tabler/icons-react';
import FooterBg from 'src/assets/images/backgrounds/footer-bg.jpg';

const Footer = () => {
  return (
    <Box>
      {/* TOP FOOTER */}
      <Box
        sx={{
          backgroundImage: `url(${FooterBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: { xs: 120, md: 140 }, // 👈 smaller
          width: '100%',
          borderTop: '1px solid #055499',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* SOCIAL ICONS */}
          <Box
            display="flex"
            alignItems="center"
            gap={1} // 👈 tighter
            flexWrap="wrap"
          >
            {[
              IconBrandFacebook,
              IconBrandInstagram,
              IconBrandTelegram,
              IconBrandYoutube,
              IconBrandWhatsapp,
            ].map((Icon, idx) => (
              <Box
                key={idx}
                component="a"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  p: 0.75, // 👈 smaller padding
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} style={{ color: '#fff' }} /> {/* 👈 smaller icon */}
              </Box>
            ))}
          </Box>

          {/* CONTACT INFO */}
          <Stack
            spacing={0.25} // 👈 very tight
            sx={{
              textAlign: 'right',
              color: 'primary.main',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              Bank Indonesia
            </Typography>
            <Typography variant="body2">
              Jalan Jendral Sudirman
            </Typography>
            <Typography variant="body2">
              Contact Center Bank Indonesia Bicara
            </Typography>
            <Typography variant="body2">
              Telp. 131 / 1500131
            </Typography>
            <Typography variant="body2">
              bicara@bi.go.id
            </Typography>
            <Typography variant="body2">
                Chatbot LISA : 081 131 131 131
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* BOTTOM BAR */}
      <Box
        sx={{
          backgroundColor: 'primary.main',
          height: 40, // 👈 reduced from 60
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <Typography variant="caption">
          © 2026 Bank Indonesia
        </Typography>
      </Box>
    </Box>
  );
};


export default Footer;
