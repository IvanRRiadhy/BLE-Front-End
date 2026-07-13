import React, { useEffect, useState } from 'react';
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
  const [footerText, setFooterText] = useState({
    companyName: 'Bionic',
    address: 'Jalan Buni Mangga Besar no 19, Taman Sari, Jakarta Barat, DKI Jakarta, Indonesia',
    contactCenter: 'Contact Center Bionic',
    phone: '0815 918 3157',
    email: 'info@bionic-indonesia.com',
    website: 'www.bionic-indonesia.com',
    copyright: '© 2026 Bionic',
  });

  useEffect(() => {
    fetch('/LoginText.json')
      .then((res) => res.json())
      .then((data) => {
        if (data.footer) {
          setFooterText({
            companyName: data.footer.companyName || 'Bionic',
            address: data.footer.address || 'Jalan Buni Mangga Besar no 19, Taman Sari, Jakarta Barat, DKI Jakarta, Indonesia',
            contactCenter: data.footer.contactCenter || 'Contact Center Bionic',
            phone: data.footer.phone || '0815 918 3157',
            email: data.footer.email || 'info@bionic-indonesia.com',
            website: data.footer.website || 'www.bionic-indonesia.com',
            copyright: data.footer.copyright || '© 2026 Bionic',
          });
        }
      })
      .catch((err) => console.error('Error loading footer text:', err));
  }, []);

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
              {footerText.companyName}
            </Typography>
            <Typography variant="body2">
              {footerText.address}
            </Typography>
            <Typography variant="body2">
              {footerText.contactCenter}
            </Typography>
            <Typography variant="body2">
              {footerText.phone}
            </Typography>
            <Typography variant="body2">
              {footerText.email}
            </Typography>
            <Typography variant="body2">
              {footerText.website}
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
          {footerText.copyright}
        </Typography>
      </Box>
    </Box>
  );
};


export default Footer;
