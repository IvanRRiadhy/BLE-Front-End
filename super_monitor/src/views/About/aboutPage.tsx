import React, { useState, useEffect, useRef } from 'react';
import { Grid2 as Grid, Box, Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Divider, CircularProgress, ListItemButton, Switch, Tooltip, styled, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Collapse } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { useLicenseInfo, toggleFeatures, getMachineId, activateLicense } from 'src/hooks/useInfo';
import { IconCpu, IconUpload, IconCheck, IconSettings, IconChevronDown } from '@tabler/icons-react';
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

const infoSections = [
  { id: 'app-details', title: 'App Details' },
  { id: 'capacity', title: 'Capacity' },
  { id: 'core-features', title: 'Core Features' },
  { id: 'modules', title: 'Modules' },
];

const customizerSections = [
  { id: 'web-customizer', title: 'Web Customizer' },
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
  const isSuperadmin = typeof window !== 'undefined' && localStorage.getItem('levelPriority')?.toLowerCase() === 'superadmin';
  const [activeTab, setActiveTab] = useState<'info' | 'customizer'>(isSuperadmin ? 'info' : 'customizer');
  const [activeSection, setActiveSection] = useState(isSuperadmin ? 'app-details' : 'web-customizer');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [machineIdDialogOpen, setMachineIdDialogOpen] = useState(false);
  const [fetchedMachineId, setFetchedMachineId] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModuleExpand = (moduleKey: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };
  console.log("data", data);
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for navbar
      const currentSections = activeTab === 'info' ? infoSections : customizerSections;

      for (let i = currentSections.length - 1; i >= 0; i--) {
        const section = document.getElementById(currentSections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(currentSections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  const handleScrollTo = (id: string, tab: 'info' | 'customizer') => {
    setActiveTab(tab);
    setActiveSection(id);
    
    // Use setTimeout to allow the view to switch before scrolling
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const top = element.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 0);
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

  if (isSuperadmin && isLoading) {
    return (
      <PageContainer title="About" description="Loading About Page">
        <Box mt={2} mb={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if ((isError || !data || !data.features || !data.features.core) && isSuperadmin) {
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
            <Box sx={{ position: 'sticky', top: 100 }}>
              {/* Application Info Group */}
              {isSuperadmin && (
                <Card variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                  <Typography variant="subtitle2" fontWeight={700} px={2} py={1.5} sx={{ bgcolor: 'action.hover' }}>
                    APPLICATION INFO
                  </Typography>
                  <Divider />
                  <List component="nav" sx={{ p: 0 }}>
                    {infoSections.map((section) => (
                      <ListItemButton
                        key={section.id}
                        selected={activeTab === 'info' && activeSection === section.id}
                        onClick={() => handleScrollTo(section.id, 'info')}
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
              )}

              {/* Web Customizer Group */}
              <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Typography variant="subtitle2" fontWeight={700} px={2} py={1.5} sx={{ bgcolor: 'action.hover' }}>
                  WEB CUSTOMIZER
                </Typography>
                <Divider />
                <List component="nav" sx={{ p: 0 }}>
                  {customizerSections.map((section) => (
                    <ListItemButton
                      key={section.id}
                      selected={activeTab === 'customizer' && activeSection === section.id}
                      onClick={() => handleScrollTo(section.id, 'customizer')}
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
            {activeTab === 'info' && isSuperadmin && data && data.features ? (
              <>
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

                {/* Info Details Section */}
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
                            </Box>
                          </ListItem>
                          {idx < Object.values(data.features.core).length - 1 && <Divider component="li" />}
                        </Box>
                      ))}
                    </List>

                    <Typography id="modules" variant="h4" mt={6} mb={2}>Modules</Typography>
                    <List dense disablePadding>
                      {Object.values(data.features.modules).map((mod, idx) => {
                        const children = data.features.subModules
                          ? Object.values(data.features.subModules).filter(subMod => subMod.key.startsWith(`${mod.key}.`))
                          : [];
                        const isExpanded = !!expandedModules[mod.key];

                        return (
                          <Box key={idx}>
                            <ListItem disableGutters sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box pl={2} display="flex" alignItems="center" gap={1}>
                                {children.length > 0 && (
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleModuleExpand(mod.key)}
                                    sx={{
                                      p: 0.5,
                                      transition: 'transform 0.2s',
                                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                  >
                                    <IconChevronDown size={20} />
                                  </IconButton>
                                )}
                                <Box>
                                  <Typography variant="h6">{mod.displayName}</Typography>
                                  <Typography variant="body1" color="textSecondary">{mod.description}</Typography>
                                </Box>
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

                            {children.length > 0 && (
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding sx={{ pl: 6, pr: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                                  {children.map((subMod, subIdx) => (
                                    <Box key={subMod.key}>
                                      <ListItem
                                        disableGutters
                                        sx={{
                                          py: 2,
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <Box>
                                          <Typography variant="subtitle1" fontWeight={600}>{subMod.displayName}</Typography>
                                          <Typography variant="body2" color="textSecondary">{subMod.description}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={2}>
                                          <Chip
                                            label={subMod.isEnabled ? "Enabled" : "Disabled"}
                                            color={subMod.isEnabled ? "success" : "default"}
                                            size="small"
                                          />
                                          {/* <Tooltip title={`Toggle ${subMod.displayName}`} arrow placement="top">
                                            <Box>
                                              <IOSSwitch
                                                size="small"
                                                checked={subMod.isEnabled}
                                                disabled={!mod.isEnabled}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleFeatureStatus({ featureKey: subMod.key, enabled: e.target.checked })}
                                              />
                                            </Box>
                                          </Tooltip> */}
                                        </Box>
                                      </ListItem>
                                      {subIdx < children.length - 1 && <Divider />}
                                    </Box>
                                  ))}
                                </List>
                              </Collapse>
                            )}
                            {idx < Object.values(data.features.modules).length - 1 && <Divider component="li" />}
                          </Box>
                        );
                      })}
                    </List>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Customizer Section */
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
                  </Grid>
                </CardContent>
              </Card>
            )}
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