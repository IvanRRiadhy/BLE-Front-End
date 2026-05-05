import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RootState, useSelector } from 'src/store/Store';
import TrackingRecord from './TrackingRecord';
import AlarmList from './Alarm';
import NewestTrack from './NewestTrack';
import Statistic from './Statistic';

const MonitoringFooter = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const footerRef = useRef<HTMLDivElement>(null); // Reference to the footer
  const toggleHeight = '50px';
  // const focus = useSelector((state: RootState) => state.layoutReducer.focus);

  const sections = [
    { id: 'section1', title: 'Tracking Record', content: <TrackingRecord /> },
    { id: 'section2', title: 'New Track', content: <NewestTrack /> },
    {
      id: 'section3',
      title: 'Alarm',
      content: <AlarmList />,
    },
    { id: 'section4', title: 'Occupancy', content: <Statistic /> },
  ];

  // Close the expanded section when clicking outside the footer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // 🔥 CRITICAL FIX: ignore clicks inside ANY MUI Dialog
      if (target.closest('.MuiDialog-root')) {
        return;
      }

      if (footerRef.current && !footerRef.current.contains(target)) {
        setExpandedSection(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSectionClick = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  return (
    <Box
      ref={footerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        bottom: 0,
        left: customizer.isMonitorSidebar ? customizer.SidebarWidth : customizer.MiniSidebarWidth,
        right: 0,
        height: expandedSection ? '300px' : toggleHeight,
        backgroundColor: 'background.paper',
        boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        transition: 'height 0.3s',
      }}
    >
      {/* Section Titles */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          height: '50px',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {sections.map((section) => {
          const isActive = expandedSection === section.id;

          return (
            <Box
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                cursor: 'pointer',
                position: 'relative',

                // 🔥 Make it feel like a button
                backgroundColor: isActive ? 'secondary.light' : 'info.main',
                borderRight: '1px solid',
                borderRightColor: 'divider',

                // 🔥 Hover effect
                '&:hover': {
                  backgroundColor: 'action.hover',
                },

                // 🔥 Active "raised tab" effect
                boxShadow: isActive ? (theme) => `inset 0 -3px 0 ${theme.palette.primary.main}` : 'none',

                transition: 'all 0.2s ease',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={isActive ? 700 : 500}
                color={isActive ? 'primary' : 'textPrimary'}
              >
                {section.title}
              </Typography>

              {/* Expand / Collapse Icon */}
              {isActive ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Box>
          );
        })}
      </Box>

      {/* Expanded Section Content */}
      {expandedSection && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            textAlign: 'center',
            width: '100%',
            height: '100%',
            top: '50px',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {sections.find((section) => section.id === expandedSection)?.content}
        </Box>
      )}
    </Box>
  );
};

export default MonitoringFooter;
