import React, { useState, useEffect, useRef } from 'react';
import { Grid2 as Grid, Box, Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Divider, CircularProgress, ListItemButton, Switch, Tooltip, styled, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Collapse } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import { useLicenseInfo, toggleFeatures, getMachineId, activateLicense } from 'src/hooks/useInfo';
import axiosServices from 'src/utils/axios';
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
  setBeaconIconType,
  setCustomSvgPath,
  setCustomSvgScale,
  setCustomSvgOffsetX,
  setCustomSvgOffsetY,
} from 'src/store/customizer/SettingsSlice';
import { RootState } from 'src/store/Store';
import WbSunnyTwoToneIcon from '@mui/icons-material/WbSunnyTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import { Stack, Slider } from '@mui/material';

const infoSections = [
  { id: 'app-details', title: 'App Details' },
  { id: 'capacity', title: 'Capacity' },
  { id: 'core-features', title: 'Core Features' },
  { id: 'modules', title: 'Modules' },
];

const customizerSections = [
  { id: 'web-customizer', title: 'Web Customizer' },
  { id: 'monitoring-customizer', title: 'Monitoring Customizer' },
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

// Pure, high-performance mathematical parser for SVG Path bounding box
const getPathBounds = (d: string) => {
  let curX = 0;
  let curY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  let idx = 0;
  const len = d.length;
  
  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  const skipWhitespace = () => {
    while (idx < len) {
      const c = d[idx];
      if (c === ' ' || c === ',' || c === '\t' || c === '\n' || c === '\r') {
        idx++;
      } else {
        break;
      }
    }
  };

  const parseNumber = (): number => {
    skipWhitespace();
    if (idx >= len) return 0;

    const start = idx;
    let c = d[idx];

    // Sign
    if (c === '+' || c === '-') {
      idx++;
    }

    let hasDigit = false;
    while (idx < len && d[idx] >= '0' && d[idx] <= '9') {
      idx++;
      hasDigit = true;
    }

    if (idx < len && d[idx] === '.') {
      idx++;
      while (idx < len && d[idx] >= '0' && d[idx] <= '9') {
        idx++;
        hasDigit = true;
      }
    }

    if (hasDigit && idx < len && (d[idx] === 'e' || d[idx] === 'E')) {
      const expIdx = idx;
      idx++;
      if (idx < len && (d[idx] === '+' || d[idx] === '-')) {
        idx++;
      }
      let hasExpDigits = false;
      while (idx < len && d[idx] >= '0' && d[idx] <= '9') {
        idx++;
        hasExpDigits = true;
      }
      if (!hasExpDigits) {
        idx = expIdx; // Backtrack
      }
    }

    if (idx > start) {
      const val = parseFloat(d.substring(start, idx));
      return isNaN(val) ? 0 : val;
    }

    return 0;
  };

  const parseFlag = (): number => {
    skipWhitespace();
    if (idx >= len) return 0;
    const c = d[idx];
    if (c === '0' || c === '1') {
      idx++;
      return c === '1' ? 1 : 0;
    }
    return 0;
  };

  let cmd = '';
  
  while (idx < len) {
    skipWhitespace();
    if (idx >= len) break;
    
    const c = d[idx];
    const isCommand = /^[a-df-z]$/i.test(c);
    
    if (isCommand) {
      cmd = c;
      idx++;
    } else {
      if (cmd === '') cmd = 'M'; 
    }
    
    const cmdLower = cmd.toLowerCase();
    
    if (cmdLower === 'm' || cmdLower === 'l') {
      const xVal = parseNumber();
      const yVal = parseNumber();
      if (cmd === 'M' || cmd === 'L') {
        curX = xVal;
        curY = yVal;
      } else {
        curX += xVal;
        curY += yVal;
      }
      updateBounds(curX, curY);
      
      if (cmd === 'M') cmd = 'L';
      if (cmd === 'm') cmd = 'l';
    } else if (cmdLower === 'h') {
      const xVal = parseNumber();
      if (cmd === 'H') {
        curX = xVal;
      } else {
        curX += xVal;
      }
      updateBounds(curX, curY);
    } else if (cmdLower === 'v') {
      const yVal = parseNumber();
      if (cmd === 'V') {
        curY = yVal;
      } else {
        curY += yVal;
      }
      updateBounds(curX, curY);
    } else if (cmdLower === 'c') {
      const x1 = parseNumber();
      const y1 = parseNumber();
      const x2 = parseNumber();
      const y2 = parseNumber();
      const x = parseNumber();
      const y = parseNumber();
      
      const targetX = cmd === 'C' ? x : curX + x;
      const targetY = cmd === 'C' ? y : curY + y;
      
      const ctrl1X = cmd === 'C' ? x1 : curX + x1;
      const ctrl1Y = cmd === 'C' ? y1 : curY + y1;
      const ctrl2X = cmd === 'C' ? x2 : curX + x2;
      const ctrl2Y = cmd === 'C' ? y2 : curY + y2;
      
      updateBounds(ctrl1X, ctrl1Y);
      updateBounds(ctrl2X, ctrl2Y);
      updateBounds(targetX, targetY);
      
      curX = targetX;
      curY = targetY;
    } else if (cmdLower === 's') {
      const x2 = parseNumber();
      const y2 = parseNumber();
      const x = parseNumber();
      const y = parseNumber();
      
      const targetX = cmd === 'S' ? x : curX + x;
      const targetY = cmd === 'S' ? y : curY + y;
      
      const ctrl2X = cmd === 'S' ? x2 : curX + x2;
      const ctrl2Y = cmd === 'S' ? y2 : curY + y2;
      
      updateBounds(ctrl2X, ctrl2Y);
      updateBounds(targetX, targetY);
      
      curX = targetX;
      curY = targetY;
    } else if (cmdLower === 'q') {
      const x1 = parseNumber();
      const y1 = parseNumber();
      const x = parseNumber();
      const y = parseNumber();
      
      const targetX = cmd === 'Q' ? x : curX + x;
      const targetY = cmd === 'Q' ? y : curY + y;
      
      const ctrl1X = cmd === 'Q' ? x1 : curX + x1;
      const ctrl1Y = cmd === 'Q' ? y1 : curY + y1;
      
      updateBounds(ctrl1X, ctrl1Y);
      updateBounds(targetX, targetY);
      
      curX = targetX;
      curY = targetY;
    } else if (cmdLower === 't') {
      const x = parseNumber();
      const y = parseNumber();
      
      curX = cmd === 'T' ? x : curX + x;
      curY = cmd === 'T' ? y : curY + y;
      updateBounds(curX, curY);
    } else if (cmdLower === 'a') {
      const rx = parseNumber();
      const ry = parseNumber();
      const xAxisRotation = parseNumber();
      const largeArcFlag = parseFlag();
      const sweepFlag = parseFlag();
      const x = parseNumber();
      const y = parseNumber();
      
      curX = cmd === 'A' ? x : curX + x;
      curY = cmd === 'A' ? y : curY + y;
      updateBounds(curX, curY);
    } else if (cmdLower === 'z') {
      // closed path
    } else {
      idx++;
    }
  }

  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    return { x: 0, y: 0, width: 24, height: 24 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const AboutPage = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const customBBox = settings.customSvgPath 
    ? getPathBounds(settings.customSvgPath)
    : { x: 0, y: 0, width: 24, height: 24 };
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useLicenseInfo();
  const { mutate: toggleFeatureStatus } = toggleFeatures();
  const { refetch: fetchMachineId, isFetching: isFetchingMachineId } = getMachineId(false);
  const { mutate: uploadLicense, isPending: isUploading } = activateLicense();
  const isSuperadmin = typeof window !== 'undefined' && localStorage.getItem('levelPriority')?.toLowerCase() === 'superadmin';
  const [activeTab, setActiveTab] = useState<'info' | 'customizer'>(isSuperadmin ? 'info' : 'customizer');
  const [activeSection, setActiveSection] = useState(isSuperadmin ? 'app-details' : 'web-customizer');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customSvgInputRef = useRef<HTMLInputElement>(null);
  const [machineIdDialogOpen, setMachineIdDialogOpen] = useState(false);
  const [fetchedMachineId, setFetchedMachineId] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModuleExpand = (moduleKey: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (data?.features) {
      const initial: Record<string, boolean> = {};
      if (data.features.modules) {
        Object.values(data.features.modules).forEach((mod: any) => {
          initial[mod.key] = mod.isEnabled;
        });
      }
      if (data.features.subModules) {
        Object.values(data.features.subModules).forEach((subMod: any) => {
          initial[subMod.key] = subMod.isEnabled;
        });
      }
      setLocalFeatures(initial);
    }
  }, [data]);

  const handleToggle = (key: string, enabled: boolean) => {
    setLocalFeatures((prev) => ({
      ...prev,
      [key]: enabled,
    }));
  };

  const hasChanges = data?.features?.modules
    ? Object.values(data.features.modules).some((mod: any) => {
        const localVal = localFeatures[mod.key];
        return localVal !== undefined && localVal !== mod.isEnabled;
      })
    : false;

  const handleApplyChanges = async () => {
    if (!data?.features?.modules) return;
    setIsApplying(true);
    const changedModules = Object.values(data.features.modules).filter((mod: any) => {
      const localVal = localFeatures[mod.key];
      return localVal !== undefined && localVal !== mod.isEnabled;
    });

    try {
      await Promise.all(
        changedModules.map((mod: any) =>
          axiosServices.post('/api/license/module/toggle', {
            featureKey: mod.key,
            enabled: localFeatures[mod.key],
          })
        )
      );
      toast.success('Module changes applied successfully.');

      // 🧹 Targeted logout: Clear session data but preserve "Remember this Device"
      const itemsToKeep = [
        'rememberedAdminUsername',
        'rememberedVisitorUsername',
        'rememberMePreference',
        'rememberedLoginMode',
      ];

      Object.keys(localStorage).forEach((key) => {
        if (!itemsToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      window.location.href = '/auth/login'; // Redirect to the login page
    } catch (error) {
      console.error(error);
      toast.error('Failed to apply module changes.');
    } finally {
      setIsApplying(false);
      setConfirmDialogOpen(false);
    }
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

  const handleCustomIconClick = () => {
    customSvgInputRef.current?.click();
  };

  const handleCustomSvgChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
        toast.error('Please upload a valid SVG file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const paths = doc.querySelectorAll('path');
        if (paths.length > 0) {
          const dAttributes = Array.from(paths)
            .map((p) => p.getAttribute('d'))
            .filter(Boolean)
            .join(' ');
          if (dAttributes) {
            // Layout-visible offscreen SVG for perfect getBBox
            const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            tempSvg.style.position = 'fixed';
            tempSvg.style.left = '-9999px';
            tempSvg.style.top = '-9999px';
            tempSvg.style.width = '2000px';
            tempSvg.style.height = '2000px';
            tempSvg.style.visibility = 'visible';
            
            const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempPath.setAttribute('d', dAttributes);
            tempSvg.appendChild(tempPath);
            document.body.appendChild(tempSvg);
            
            let bbox = tempPath.getBBox();
            document.body.removeChild(tempSvg);

            // Fallback parsing if layout calculation returns zero bounds
            if (!bbox.width || !bbox.height) {
              const numbers = dAttributes.match(/-?[\d.]+/g)?.map(Number) || [];
              if (numbers.length > 0) {
                const xs = numbers.filter((_, idx) => idx % 2 === 0);
                const ys = numbers.filter((_, idx) => idx % 2 === 1);
                if (xs.length > 0 && ys.length > 0) {
                  const minX = Math.min(...xs);
                  const maxX = Math.max(...xs);
                  const minY = Math.min(...ys);
                  const maxY = Math.max(...ys);
                  bbox = {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                  } as DOMRect;
                }
              }
            }

            const targetSize = 24;
            const maxDim = Math.max(bbox.width, bbox.height) || 24;
            const scaleFactor = targetSize / maxDim;
            const offsetX = -bbox.x;
            const offsetY = -bbox.y;

            dispatch(setCustomSvgPath(dAttributes));
            dispatch(setCustomSvgScale(scaleFactor));
            dispatch(setCustomSvgOffsetX(offsetX));
            dispatch(setCustomSvgOffsetY(offsetY));
            dispatch(setBeaconIconType('custom'));
            toast.success('Custom SVG icon uploaded successfully!');
          } else {
            toast.error('No valid path elements found in the SVG.');
          }
        } else {
          toast.error('No path elements found in the SVG.');
        }
      };
      reader.readAsText(file);
      if (customSvgInputRef.current) {
        customSvgInputRef.current.value = '';
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
                  APP CUSTOMIZER
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
                                <Chip
                                  label={(localFeatures[mod.key] ?? mod.isEnabled) ? "Enabled" : "Disabled"}
                                  color={(localFeatures[mod.key] ?? mod.isEnabled) ? "success" : "default"}
                                  size="medium"
                                />
                                <Tooltip title={`Toggle ${mod.displayName}`} arrow placement="top">
                                  <Box>
                                    <IOSSwitch 
                                      checked={localFeatures[mod.key] ?? mod.isEnabled} 
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleToggle(mod.key, e.target.checked)} 
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
                                            label={(localFeatures[subMod.key] ?? subMod.isEnabled) ? "Enabled" : "Disabled"}
                                            color={(localFeatures[subMod.key] ?? subMod.isEnabled) ? "success" : "default"}
                                            size="small"
                                          />
                                          {/* <Tooltip title={`Toggle ${subMod.displayName}`} arrow placement="top">
                                            <Box>
                                              <IOSSwitch
                                                size="small"
                                                checked={localFeatures[subMod.key] ?? subMod.isEnabled}
                                                disabled={!(localFeatures[mod.key] ?? mod.isEnabled)}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleToggle(subMod.key, e.target.checked)}
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
                    {hasChanges && (
                      <Box
                        sx={{
                          position: 'sticky',
                          bottom: 24,
                          display: 'flex',
                          justifyContent: 'flex-end',
                          zIndex: 10,
                          mt: 2,
                          pointerEvents: 'none',
                        }}
                      >
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => setConfirmDialogOpen(true)}
                          sx={{
                            pointerEvents: 'auto',
                            boxShadow: (theme) => theme.shadows[10],
                            borderRadius: '50px',
                            px: 4,
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                          }}
                        >
                          Apply
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Customizer Section */
              <>
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

                {/* Monitoring Customizer */}
                <Card variant="outlined" sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography id="monitoring-customizer" variant="h4" mb={3}>
                      Monitoring Customizer
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="h6" gutterBottom>
                          Beacon Icon Type (Format SVG, size 24x24 px)
                        </Typography>
                        <Stack direction={'row'} gap={2} my={2}>
                          <StyledBox
                            onClick={() => dispatch(setBeaconIconType('person'))}
                            display="flex"
                            alignItems="center"
                            gap={1}
                            flex={1}
                            sx={{
                              borderColor: settings.beaconIconType === 'person' ? 'primary.main' : 'inherit',
                              bgcolor: settings.beaconIconType === 'person' ? 'primary.light' : 'transparent',
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 32 32" style={{ fill: '#1976d2', flexShrink: 0 }}>
                              <path d="M16 15.503A5.041 5.041 0 1 0 16 5.42a5.041 5.041 0 0 0 0 10.083zm0 2.215c-6.703 0-11 3.699-11 5.5v3.363h22v-3.363c0-2.178-4.068-5.5-11-5.5z" />
                            </svg>
                            Person Icon
                          </StyledBox>
                          <StyledBox
                            onClick={() => dispatch(setBeaconIconType('pin'))}
                            display="flex"
                            alignItems="center"
                            gap={1}
                            flex={1}
                            sx={{
                              borderColor: settings.beaconIconType === 'pin' ? 'primary.main' : 'inherit',
                              bgcolor: settings.beaconIconType === 'pin' ? 'primary.light' : 'transparent',
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 16 16" style={{ fill: '#1976d2', flexShrink: 0 }}>
                              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
                            </svg>
                            Pin Icon
                          </StyledBox>
                          <StyledBox
                            onClick={handleCustomIconClick}
                            display="flex"
                            alignItems="center"
                            gap={1}
                            flex={1}
                            sx={{
                              borderColor: settings.beaconIconType === 'custom' ? 'primary.main' : 'inherit',
                              bgcolor: settings.beaconIconType === 'custom' ? 'primary.light' : 'transparent',
                            }}
                          >
                            {settings.customSvgPath && (
                              <svg 
                                width="20" 
                                height="20" 
                                viewBox={`${customBBox.x} ${customBBox.y} ${customBBox.width} ${customBBox.height}`} 
                                style={{ fill: '#1976d2', flexShrink: 0 }}
                              >
                                <path d={settings.customSvgPath} />
                              </svg>
                            )}
                            {settings.customSvgPath ? 'Custom Icon (Uploaded)' : 'Upload Custom SVG'}
                          </StyledBox>
                        </Stack>
                        <input
                          type="file"
                          ref={customSvgInputRef}
                          accept=".svg"
                          style={{ display: 'none' }}
                          onChange={handleCustomSvgChange}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </>
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

      {/* Apply Changes Confirmation Modal */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !isApplying && setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Module Changes</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Typography variant="body1">
            Are you sure you want to apply these changes? This will save the module configuration, log you out of the system, and redirect you to the login page.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit" disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApplyChanges} color="primary" variant="contained" disabled={isApplying}>
            {isApplying ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AboutPage;