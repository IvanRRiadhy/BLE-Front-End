import { Grid2 as Grid, Box, Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Divider } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';


const data = {
  isValid: true,
  validationMessage: "License is valid",
  licenseType: "Perpetual",
  licenseTier: "Custom",
  customerName: "BIO-EXPERIENCE",
  applicationName: "BIO - People Tracking App",
  applicationCustomName: "Fantastic Frozen Hat",
  applicationCustomDomain: "myrtis.com",
  applicationRegistered: "2025-06-18T23:11:21.072Z",
  expirationDate: "2126-03-13T15:03:36.000Z",
  daysRemaining: 36524,
  maxBeacons: 10000,
  maxReaders: 10000,
  features: {
    core: {
      coreMasterData: {
        key: "core.masterData",
        displayName: "Master Data Management",
        description: "Manage master data: employees, visitors, buildings, floors, etc.",
        isEnabled: true
      },
      tracking: {
        key: "core.tracking",
        displayName: "Real-Time Tracking",
        description: "Real-time BLE tracking and position monitoring",
        isEnabled: true
      },
      monitoring: {
        key: "core.monitoring",
        displayName: "Monitoring Dashboard",
        description: "Live monitoring dashboard and map views",
        isEnabled: true
      },
      alarm: {
        key: "core.alarm",
        displayName: "Alarm & Notification",
        description: "Alarm triggers, notifications, and alert management",
        isEnabled: true
      },
      patrol: {
        key: "core.patrol",
        displayName: "Patrol Management",
        description: "Patrol route management and checkpoint tracking",
        isEnabled: true
      },
      reporting: {
        key: "core.reporting",
        displayName: "Reports & Analytics",
        description: "Reports, analytics, and data export",
        isEnabled: true
      }
    },
    modules: {
      activeDirectory: {
        key: "module.activeDirectory",
        displayName: "Active Directory Sync",
        description: "Automatic employee synchronization with Active Directory",
        isEnabled: false
      },
      sso: {
        key: "module.sso",
        displayName: "Single Sign-On (SSO)",
        description: "Windows authentication and Single Sign-On integration",
        isEnabled: true
      }
    }
  }
};

const AboutPage = () => {
  return (
    <PageContainer title="About" description="this is About Page">
      <Box mt={2} mb={3}>
        <Grid container spacing={3}>
          {/* Left Side */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" mb={2}>App Details</Typography>
                
                <List disablePadding>
                  <ListItem disableGutters>
                    <ListItemText primary="Status" secondary={data.validationMessage} />
                    <Chip label={data.isValid ? "Valid" : "Invalid"} color={data.isValid ? "success" : "error"} size="small" />
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters>
                    <ListItemText primary="License" secondary={`${data.licenseType} - ${data.licenseTier}`} />
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters>
                    <ListItemText primary="App Name" secondary={data.applicationName} />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText primary="Custom Name & Domain" secondary={`${data.applicationCustomName} (${data.applicationCustomDomain})`} />
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters>
                    <ListItemText primary="Customer Name" secondary={data.customerName} />
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters>
                    <ListItemText primary="Expiration Date" secondary={`${new Date(data.expirationDate).toLocaleDateString()} (${data.daysRemaining} days remaining)`} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Side */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" mb={2}>Capacity & Features</Typography>
                
                <Grid container spacing={2} mb={3}>
                  <Grid size={{ xs: 6 }}>
                    <Box p={2} bgcolor="primary.light" borderRadius={2} color="primary.main" textAlign="center" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography variant="h4">{data.maxReaders.toLocaleString()}</Typography>
                      <Typography variant="subtitle2">Max Readers</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box p={2} bgcolor="secondary.light" borderRadius={2} color="secondary.main" textAlign="center" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography variant="h4">{data.maxBeacons.toLocaleString()}</Typography>
                      <Typography variant="subtitle2">Max Beacons</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Typography variant="h6" mb={1}>Core Features</Typography>
                <List dense disablePadding>
                  {Object.values(data.features.core).map((feature, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText primary={feature.displayName} secondary={feature.description} />
                      <Chip label={feature.isEnabled ? "Enabled" : "Disabled"} color={feature.isEnabled ? "success" : "default"} size="small" />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="h6" mt={2} mb={1}>Modules</Typography>
                <List dense disablePadding>
                  {Object.values(data.features.modules).map((mod, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText primary={mod.displayName} secondary={mod.description} />
                      <Chip label={mod.isEnabled ? "Enabled" : "Disabled"} color={mod.isEnabled ? "success" : "default"} size="small" />
                    </ListItem>
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