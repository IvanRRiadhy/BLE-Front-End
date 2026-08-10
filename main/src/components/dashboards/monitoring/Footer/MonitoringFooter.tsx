import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RootState, useSelector } from 'src/store/Store';
import TrackingRecord from './TrackingRecord';
import AlarmList from './Alarm';
import NewestTrack from './NewestTrack';
import Statistic from './Statistic';

interface MonitoringFooterProps {
  showSidebar?: boolean;
  setShowSidebar?: React.Dispatch<React.SetStateAction<boolean>>;
  showRightSidebar?: boolean;
  expandedSection?: string | null;
  setExpandedSection?: React.Dispatch<React.SetStateAction<string | null>>;
}

const MonitoringFooter: React.FC<MonitoringFooterProps> = ({
  showSidebar = true,
  setShowSidebar,
  showRightSidebar = true,
  expandedSection: parentExpandedSection,
  setExpandedSection: parentSetExpandedSection,
}) => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  const followingPersons = useSelector((state: RootState) => state.layoutReducer.followingPersons ?? []);
  const isFollowing = !!(followingPerson || followingPersons.length > 0);

  const [localExpandedSection, setLocalExpandedSection] = useState<string | null>(null);

  const expandedSection = parentExpandedSection !== undefined ? parentExpandedSection : localExpandedSection;
  const setExpandedSection = parentSetExpandedSection || setLocalExpandedSection;

  const footerRef = useRef<HTMLDivElement>(null); // Reference to the footer
  const toggleHeight = '50px';

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
  }, [setExpandedSection]);

  const handleSectionClick = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  // Compute left position based on showSidebar prop
  const leftOffset = showSidebar
    ? customizer.isMonitorSidebar
      ? settings.SidebarWidth
      : settings.MiniSidebarWidth
    : 0;

  // Compute right position based on right sidebar visibility & active follow
  const rightOffset = isFollowing && showRightSidebar ? settings.SidebarWidth : 0;

  return (
    <Box
      ref={footerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        bottom: 0,
        left: leftOffset,
        right: rightOffset,
        height: expandedSection ? '300px' : toggleHeight,
        backgroundColor: 'background.paper',
        boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        transition: 'height 0.3s, left 0.2s ease, right 0.2s ease',
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
