import React, { useState, useEffect } from 'react';
import { Grid2 as Grid, Box, Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Divider, CircularProgress, ListItemButton, Switch, Tooltip, styled } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { useLicenseInfo, toggleFeatures } from 'src/hooks/useInfo';

const sections = [
  { id: 'app-details', title: 'App Details' },
  { id: 'capacity', title: 'Capacity' },
  { id: 'core-features', title: 'Core Features' },
  { id: 'modules', title: 'Modules' }
];

const IOSSwitch = styled((props: any) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.success.main,
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: theme.palette.success.main,
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.grey[100],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 22,
    height: 22,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

const AboutPage = () => {
  const { data, isLoading, isError } = useLicenseInfo();
  const { mutate: toggleFeatureStatus } = toggleFeatures();
  const [activeSection, setActiveSection] = useState('app-details');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for navbar

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="About" description="Loading About Page">
        <Box mt={2} mb={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (isError || !data || !data.features || !data.features.core) {
    return (
      <PageContainer title="About" description="Error loading about page">
        <Box mt={2} mb={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography color="error">Failed to load license info.</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="About" description="this is About Page">
      <Box mt={2} mb={3}>
        <Grid container spacing={4}>
          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100, borderRadius: 2, overflow: 'hidden' }}>
              <Card variant="outlined">
                <List component="nav" sx={{ p: 0 }}>
                  {sections.map((section) => (
                    <ListItemButton
                      key={section.id}
                      selected={activeSection === section.id}
                      onClick={() => handleScrollTo(section.id)}
                      sx={{
                        borderLeft: '4px solid transparent',
                        '&.Mui-selected': {
                          borderLeftColor: 'primary.main',
                          bgcolor: 'primary.light',
                          '& .MuiTypography-root': {
                            color: 'primary.main',
                            fontWeight: 600,
                          }
                        }
                      }}
                    >
                      <ListItemText primary={section.title} />
                    </ListItemButton>
                  ))}
                </List>
              </Card>
            </Box>
          </Grid>

          {/* Content area */}
          <Grid size={{ xs: 12, md: 9 }}>
            {/* Top Section: App Details */}
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Typography id="app-details" variant="h4" mb={2}>App Details</Typography>
                
                <List disablePadding>
                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">Status</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="h6" fontWeight={500}>{data.validationMessage}</Typography>
                      <Chip label={data.isValid ? "Valid" : "Invalid"} color={data.isValid ? "success" : "error"} size="medium" />
                    </Box>
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">License</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={500}>{`${data.licenseType} - ${data.licenseTier}`}</Typography>
                    </Box>
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">App Name</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={500}>{data.applicationName}</Typography>
                    </Box>
                  </ListItem>
                  <Divider component="li" />

                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">Custom Name & Domain</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={500}>{`${data.applicationCustomName} (${data.applicationCustomDomain})`}</Typography>
                    </Box>
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">Customer Name</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={500}>{data.customerName}</Typography>
                    </Box>
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">Expiration Date</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={500}>{`${new Date(data.expirationDate).toLocaleDateString()} (${data.daysRemaining} days remaining)`}</Typography>
                    </Box>
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Bottom Section */}
            <Card variant="outlined">
              <CardContent>
                <Typography id="capacity" variant="h4" mb={2}>Capacity</Typography>
                
                <Grid container spacing={3} mb={4}>
                  <Grid size={{ xs: 6 }}>
                    <Box p={4} bgcolor="primary.light" borderRadius={2} color="primary.main" textAlign="center">
                      <Typography variant="h3" fontWeight={700}>{data.maxReaders.toLocaleString()}</Typography>
                      <Typography variant="h6">Max Readers</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box p={4} bgcolor="secondary.light" borderRadius={2} color="secondary.main" textAlign="center">
                      <Typography variant="h3" fontWeight={700}>{data.maxBeacons.toLocaleString()}</Typography>
                      <Typography variant="h6">Max Beacons</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Typography id="core-features" variant="h4" mb={2} mt={6}>Core Features</Typography>
                <List dense disablePadding>
                  {Object.values(data.features.core).map((feature, idx) => (
                    <Box key={idx}>
                      <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box pl={2}>
                          <Typography variant="h6">{feature.displayName}</Typography>
                          <Typography variant="body1" color="textSecondary">{feature.description}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Chip label={feature.isEnabled ? "Enabled" : "Disabled"} color={feature.isEnabled ? "success" : "default"} size="medium" />
                          {/* <Tooltip title={`Toggle ${feature.displayName}`} arrow placement="top">
                            <Box>
                              <IOSSwitch 
                                checked={feature.isEnabled} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleFeatureStatus({ featureKey: feature.key, enabled: e.target.checked })} 
                              />
                            </Box>
                          </Tooltip> */}
                        </Box>
                      </ListItem>
                      {idx < Object.values(data.features.core).length - 1 && <Divider component="li" />}
                    </Box>
                  ))}
                </List>

                <Typography id="modules" variant="h4" mt={6} mb={2}>Modules</Typography>
                <List dense disablePadding>
                  {Object.values(data.features.modules).map((mod, idx) => (
                    <Box key={idx}>
                      <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box pl={2}>
                          <Typography variant="h6">{mod.displayName}</Typography>
                          <Typography variant="body1" color="textSecondary">{mod.description}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Chip label={mod.isEnabled ? "Enabled" : "Disabled"} color={mod.isEnabled ? "success" : "default"} size="medium" />
                          <Tooltip title={`Toggle ${mod.displayName}`} arrow placement="top">
                            <Box>
                              <IOSSwitch 
                                checked={mod.isEnabled} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleFeatureStatus({ featureKey: mod.key, enabled: e.target.checked })} 
                              />
                            </Box>
                          </Tooltip>
                        </Box>
                      </ListItem>
                      {idx < Object.values(data.features.modules).length - 1 && <Divider component="li" />}
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default AboutPage;