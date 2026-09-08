import { useState } from 'react';
import { Box, Paper, Button, Tooltip, Tabs, Tab } from '@mui/material';
import { IconChevronUp } from '@tabler/icons-react';
import TrackingRecord from './TrackingRecord';
import AlarmList from './Alarm';
import NewestTrack from './NewestTrack';
import Statistic from './Statistic';

interface SectionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: SectionItem[] = [
  { id: 'section1', title: 'Tracking Record', content: <TrackingRecord /> },
  { id: 'section2', title: 'New Track', content: <NewestTrack /> },
  { id: 'section3', title: 'Alarm', content: <AlarmList /> },
  { id: 'section4', title: 'Occupancy', content: <Statistic /> },
];

interface MonitoringFooter2Props {
  onInteract?: () => void;
  onScrollToTop?: () => void;
}

const MonitoringFooter2: React.FC<MonitoringFooter2Props> = ({ onInteract, onScrollToTop }) => {
  const [activeTab, setActiveTab] = useState<string>('section1');

  const currentSection = sections.find((s) => s.id === activeTab) || sections[0];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    onInteract?.();
  };

  const handleScrollToTop = () => {
    if (onScrollToTop) {
      onScrollToTop();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Paper
      elevation={3}
      onClick={() => onInteract?.()}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Native Styled Tabs Header */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => handleSelectTab(val)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: '48px',
            '& .MuiTab-root': {
              minHeight: '48px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
                bgcolor: 'background.paper',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
            },
          }}
        >
          {sections.map((section) => (
            <Tab key={section.id} value={section.id} label={section.title} />
          ))}
        </Tabs>
      </Box>

      {/* Segment Content View (overflow hidden to prevent duplicate outer scrollbars) */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          p: 1.5,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
        }}
      >
        {currentSection.content}
      </Box>

      {/* Sticky Bottom Scroll To Top Button */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 24,
          zIndex: 1000,
        }}
      >
        <Tooltip title="Scroll back to Monitoring Grid view" placement="left">
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={(e) => {
              e.stopPropagation();
              handleScrollToTop();
            }}
            startIcon={<IconChevronUp size={20} />}
            sx={{
              borderRadius: '24px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              py: 0.9,
              px: 2.2,
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0,0,0,0.6)'
                  : '0 6px 20px rgba(93, 135, 255, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              backdropFilter: 'blur(8px)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 6px 24px rgba(0,0,0,0.8)'
                    : '0 8px 25px rgba(93, 135, 255, 0.6)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Back to Grid
          </Button>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default MonitoringFooter2;
