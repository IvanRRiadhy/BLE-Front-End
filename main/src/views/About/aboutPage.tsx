import React, { useState, useEffect, useRef } from 'react';
import { Grid2 as Grid, Box, Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Divider, CircularProgress, ListItemButton, Switch, Tooltip, styled, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { useLicenseInfo, toggleFeatures, getMachineId, activateLicense } from 'src/hooks/useInfo';
import { IconCpu, IconUpload, IconCheck, IconSettings } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'src/store/Store';
import {
  toggleSidebar,
  toggleHorizontal,
} from 'src/store/customizer/CustomizerSlice';
import {
  setTheme,
  setDarkMode,
  setDir,
  setLanguage,
  setCardShadow,
  toggleLayout,
  setBorderRadius,
} from 'src/store/customizer/SettingsSlice';
import { RootState } from 'src/store/Store';
import WbSunnyTwoToneIcon from '@mui/icons-material/WbSunnyTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import SwipeLeftAltTwoToneIcon from '@mui/icons-material/SwipeLeftAltTwoTone';
import SwipeRightAltTwoToneIcon from '@mui/icons-material/SwipeRightAltTwoTone';
import { ViewComfyTwoTone, PaddingTwoTone, BorderOuter } from '@mui/icons-material';
import CallToActionTwoToneIcon from '@mui/icons-material/CallToActionTwoTone';
import AspectRatioTwoToneIcon from '@mui/icons-material/AspectRatioTwoTone';
import WebAssetTwoToneIcon from '@mui/icons-material/WebAssetTwoTone';
import ViewSidebarTwoToneIcon from '@mui/icons-material/ViewSidebarTwoTone';
import { Stack, Slider } from '@mui/material';

const sections = [
  { id: 'app-details', title: 'App Details' },
  { id: 'web-customizer', title: 'Web Customizer' },
  { id: 'capacity', title: 'Capacity' },
  { id: 'core-features', title: 'Core Features' },
  { id: 'modules', title: 'Modules' },
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

const StyledBox = styled(Box)(({ theme }) => ({
  boxShadow: theme.shadows[8],
  padding: '20px',
  cursor: 'pointer',
  justifyContent: 'center',
  display: 'flex',
  transition: '0.1s ease-in',
  border: '1px solid rgba(145, 158, 171, 0.12)',
  borderRadius: '12px',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

const thColors = [
  { id: 1, bgColor: '#5D87FF', disp: 'BLUE_THEME' },
  { id: 2, bgColor: '#0074BA', disp: 'AQUA_THEME' },
  { id: 3, bgColor: '#763EBD', disp: 'PURPLE_THEME' },
  { id: 4, bgColor: '#0A7EA4', disp: 'GREEN_THEME' },
  { id: 5, bgColor: '#01C0C8', disp: 'CYAN_THEME' },
  { id: 6, bgColor: '#FA896B', disp: 'ORANGE_THEME' },
];

const AboutPage = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useLicenseInfo();
  const { mutate: toggleFeatureStatus } = toggleFeatures();
  const { refetch: fetchMachineId, isFetching: isFetchingMachineId } = getMachineId(false);
  const { mutate: uploadLicense, isPending: isUploading } = activateLicense();
  const [activeSection, setActiveSection] = useState('app-details');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [machineIdDialogOpen, setMachineIdDialogOpen] = useState(false);
  const [fetchedMachineId, setFetchedMachineId] = useState('');

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

  const handleGetMachineId = async () => {
    try {
      const result = await fetchMachineId();
      console.log("Machine ID Result: ", result.data);
      if (result.data) {
        setFetchedMachineId(result.data);
        setMachineIdDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to get Machine ID');
    }
  };

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(fetchedMachineId);
    toast.success('Machine ID copied to clipboard');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLicense({ file });
      // Clear the input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
                      {!data.isValid && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          startIcon={<IconCpu size={18} />}
                          onClick={handleGetMachineId}
                          disabled={isFetchingMachineId}
                        >
                          {isFetchingMachineId ? 'Getting...' : 'Get Machine ID'}
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                  <Divider component="li" />
                  
                  <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box pl={2}>
                      <Typography variant="h6" color="textSecondary">License</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="h6" fontWeight={500}>{`${data.licenseType} - ${data.licenseTier}`}</Typography>
                      {!data.isValid && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          startIcon={<IconUpload size={18} />}
                          onClick={handleUploadClick}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload License'}
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                  <Divider component="li" />

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".lic"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  
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

            {/* Customizer Section */}
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Typography id="web-customizer" variant="h4" mb={3}>
                  Web Customizer
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="h6" gutterBottom>
                      Theme Option
                    </Typography>
                    <Stack direction={'row'} gap={2} my={2}>
                      <StyledBox
                        onClick={() => dispatch(setDarkMode('light'))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: settings.activeMode === 'light' ? 'primary.main' : 'inherit',
                          bgcolor: settings.activeMode === 'light' ? 'primary.light' : 'transparent',
                        }}
                      >
                        <WbSunnyTwoToneIcon
                          color={settings.activeMode === 'light' ? 'primary' : 'inherit'}
                        />
                        Light
                      </StyledBox>
                      <StyledBox
                        onClick={() => dispatch(setDarkMode('dark'))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: settings.activeMode === 'dark' ? 'primary.main' : 'inherit',
                          bgcolor: settings.activeMode === 'dark' ? 'primary.light' : 'transparent',
                        }}
                      >
                        <DarkModeTwoToneIcon
                          color={settings.activeMode === 'dark' ? 'primary' : 'inherit'}
                        />
                        Dark
                      </StyledBox>
                    </Stack>
                  </Grid>

                  {/* Theme Colors */}
                  <Grid size={12}>
                    <Typography variant="h6" gutterBottom mt={2}>
                      Theme Colors
                    </Typography>
                    <Grid container spacing={2} my={1}>
                      {thColors.map((thcolor) => (
                        <Grid key={thcolor.id} size={{ xs: 4, sm: 2 }}>
                          <StyledBox
                            onClick={() => dispatch(setTheme(thcolor.disp))}
                            sx={{
                              borderColor:
                                settings.activeTheme === thcolor.disp
                                  ? 'primary.main'
                                  : 'inherit',
                              bgcolor:
                                settings.activeTheme === thcolor.disp
                                  ? 'primary.light'
                                  : 'transparent',
                            }}
                          >
                            <Tooltip title={`${thcolor.disp}`} placement="top">
                              <Box
                                sx={{
                                  backgroundColor: thcolor.bgColor,
                                  width: '25px',
                                  height: '25px',
                                  borderRadius: '60px',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  display: 'flex',
                                  color: 'white',
                                }}
                              >
                                {settings.activeTheme === thcolor.disp ? (
                                  <IconCheck width={13} />
                                ) : (
                                  ''
                                )}
                              </Box>
                            </Tooltip>
                          </StyledBox>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

                  {/* Layout Type */}
                  {/* <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="h6" gutterBottom mt={2}>
                      Layout Type
                    </Typography>
                    <Stack direction={'row'} gap={2} my={2}>
                      <StyledBox
                        onClick={() => dispatch(toggleHorizontal(false))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: !customizer.isHorizontal ? 'primary.main' : 'inherit',
                          bgcolor: !customizer.isHorizontal ? 'primary.light' : 'transparent',
                        }}
                      >
                        <ViewComfyTwoTone
                          color={customizer.isHorizontal === false ? 'primary' : 'inherit'}
                        />
                        Vertical
                      </StyledBox>
                      <StyledBox
                        onClick={() => dispatch(toggleHorizontal(true))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: customizer.isHorizontal ? 'primary.main' : 'inherit',
                          bgcolor: customizer.isHorizontal ? 'primary.light' : 'transparent',
                        }}
                      >
                        <PaddingTwoTone
                          color={customizer.isHorizontal === true ? 'primary' : 'inherit'}
                        />
                        Horizontal
                      </StyledBox>
                    </Stack>
                  </Grid> */}

                  {/* Container Option */}
                  {/* <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="h6" gutterBottom mt={2}>
                      Container Option
                    </Typography>
                    <Stack direction={'row'} gap={2} my={2}>
                      <StyledBox
                        onClick={() => dispatch(toggleLayout('boxed'))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: customizer.isLayout === 'boxed' ? 'primary.main' : 'inherit',
                          bgcolor: customizer.isLayout === 'boxed' ? 'primary.light' : 'transparent',
                        }}
                      >
                        <CallToActionTwoToneIcon
                          color={customizer.isLayout === 'boxed' ? 'primary' : 'inherit'}
                        />
                        Boxed
                      </StyledBox>
                      <StyledBox
                        onClick={() => dispatch(toggleLayout('full'))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: customizer.isLayout === 'full' ? 'primary.main' : 'inherit',
                          bgcolor: customizer.isLayout === 'full' ? 'primary.light' : 'transparent',
                        }}
                      >
                        <AspectRatioTwoToneIcon
                          color={customizer.isLayout === 'full' ? 'primary' : 'inherit'}
                        />
                        Full
                      </StyledBox>
                    </Stack>
                  </Grid> */}

                  {/* Sidebar Type */}
                  {/* {!customizer.isHorizontal && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="h6" gutterBottom mt={2}>
                        Sidebar Type
                      </Typography>
                      <Stack direction={'row'} gap={2} my={2}>
                        <StyledBox
                          onClick={() => dispatch(toggleSidebar())}
                          display="flex"
                          gap={1}
                          flex={1}
                          sx={{
                            borderColor: !customizer.isCollapse ? 'primary.main' : 'inherit',
                            bgcolor: !customizer.isCollapse ? 'primary.light' : 'transparent',
                          }}
                        >
                          <WebAssetTwoToneIcon
                            color={!customizer.isCollapse ? 'primary' : 'inherit'}
                          />
                          Full
                        </StyledBox>
                        <StyledBox
                          onClick={() => dispatch(toggleSidebar())}
                          display="flex"
                          gap={1}
                          flex={1}
                          sx={{
                            borderColor: customizer.isCollapse ? 'primary.main' : 'inherit',
                            bgcolor: customizer.isCollapse ? 'primary.light' : 'transparent',
                          }}
                        >
                          <ViewSidebarTwoToneIcon
                            color={customizer.isCollapse ? 'primary' : 'inherit'}
                          />
                          Mini
                        </StyledBox>
                      </Stack>
                    </Grid>
                  )} */}

                  {/* Card Shadow */}
                  {/* <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="h6" gutterBottom mt={2}>
                      Card Option
                    </Typography>
                    <Stack direction={'row'} gap={2} my={2}>
                      <StyledBox
                        onClick={() => dispatch(setCardShadow(false))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: !customizer.isCardShadow ? 'primary.main' : 'inherit',
                          bgcolor: !customizer.isCardShadow ? 'primary.light' : 'transparent',
                        }}
                      >
                        <BorderOuter color={!customizer.isCardShadow ? 'primary' : 'inherit'} />
                        Border
                      </StyledBox>
                      <StyledBox
                        onClick={() => dispatch(setCardShadow(true))}
                        display="flex"
                        gap={1}
                        flex={1}
                        sx={{
                          borderColor: customizer.isCardShadow ? 'primary.main' : 'inherit',
                          bgcolor: customizer.isCardShadow ? 'primary.light' : 'transparent',
                        }}
                      >
                        <CallToActionTwoToneIcon
                          color={customizer.isCardShadow ? 'primary' : 'inherit'}
                        />
                        Shadow
                      </StyledBox>
                    </Stack>
                  </Grid> */}

                  {/* Border Radius */}
                  {/* <Grid size={12}>
                    <Typography variant="h6" gutterBottom mt={2}>
                      Theme Border Radius
                    </Typography>
                    <Box px={2} py={1}>
                      <Slider
                        size="small"
                        value={customizer.borderRadius}
                        min={4}
                        max={24}
                        onChange={(event: any) => dispatch(setBorderRadius(event.target.value))}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Grid> */}
                </Grid>
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

      {/* Machine ID Modal */}
      <Dialog
        open={machineIdDialogOpen}
        onClose={() => setMachineIdDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Machine ID Retrieval</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Typography variant="body1" mb={2}>
            Please provide this Machine ID to your administrator to retrieve a valid license.
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            label="Machine ID"
            value={fetchedMachineId}
            InputProps={{
              readOnly: true,
            }}
            sx={{
              '& .MuiOutlinedInput-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setMachineIdDialogOpen(false)} color="inherit">
            Close
          </Button>
          <Button onClick={handleCopyMachineId} color="primary" variant="contained">
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AboutPage;