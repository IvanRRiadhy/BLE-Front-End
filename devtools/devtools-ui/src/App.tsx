import React, { useMemo, useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TuneIcon from '@mui/icons-material/Tune';

import { FloorplanDevTools } from './pages/FloorplanDevTools';
import { AnnotationTool } from './pages/AnnotationTool';
import { EvaluationViewer } from './pages/EvaluationViewer';

type AppTab = 'detector' | 'annotation' | 'evaluation';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'detector' || tabParam === 'annotation' || tabParam === 'evaluation') {
        return tabParam;
      }
      return 'annotation';
    } catch {
      return 'annotation';
    }
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#0284c7',
            light: '#38bdf8',
            dark: '#0369a1',
          },
          secondary: {
            main: '#228B22',
            light: '#4ade80',
            dark: '#15803d',
          },
          background: {
            default: '#0b0f17',
            paper: '#0e1420',
          },
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
          },
          divider: '#1f2937',
        },
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 6,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 6,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#0b0f17',
          overflow: 'hidden',
        }}
      >
        {/* Top App Header & Module Switcher */}
        <Box
          sx={{
            px: 2.5,
            py: 0.6,
            backgroundColor: '#0a0e17',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
          }}
        >
          {/* Logo & Product Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 1,
                backgroundColor: '#0369a1',
                color: '#38bdf8',
              }}
            >
              <ArchitectureIcon fontSize="small" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>
                  BIONIC
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Floorplan DevTools
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Module Navigation Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, val: AppTab) => {
              setActiveTab(val);
              try {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', val);
                window.history.replaceState({}, '', url.toString());
              } catch {}
            }}
            sx={{
              minHeight: 38,
              '& .MuiTabs-indicator': {
                backgroundColor: '#38bdf8',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                minHeight: 38,
                py: 0.8,
                px: 2,
                fontSize: '0.82rem',
                fontWeight: 600,
                textTransform: 'none',
                color: '#94a3b8',
                gap: 0.8,
                '&.Mui-selected': {
                  color: '#38bdf8',
                },
              },
            }}
          >
            <Tab
              value="annotation"
              icon={<EditLocationAltIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Annotation Tool"
            />
            <Tab
              value="detector"
              icon={<TuneIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Detector Inspector"
            />
            <Tab
              value="evaluation"
              icon={<AssessmentIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Evaluation Harness"
            />
          </Tabs>

          {/* Right Header Metadata */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
              Dataset: <strong>my_floorplan</strong>
            </Typography>
          </Box>
        </Box>

        {/* Content Views */}
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'annotation' && <AnnotationTool />}
          {activeTab === 'detector' && <FloorplanDevTools />}
          {activeTab === 'evaluation' && <EvaluationViewer />}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
