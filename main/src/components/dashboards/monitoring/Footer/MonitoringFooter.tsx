import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { AppState, useSelector } from 'src/store/Store';
import TrackingRecord from './TrackingRecord';
import AlarmList from './Alarm';

const MonitoringFooter = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const footerRef = useRef<HTMLDivElement>(null); // Reference to the footer
  const toggleHeight = customizer.isMonitorSidebar ? '50px' : '0px';

  const sections = [
    { id: 'section1', title: 'Tracking Record', content: <TrackingRecord /> },
    { id: 'section2', title: 'New Track', content: <TrackingRecord isNew /> },
    { id: 'section3', title: 'Alarm', content: <AlarmList /> },
    { id: 'section4', title: 'CCTV', content: 'Content for Section 4' },
  ];

  // Close the expanded section when clicking outside the footer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (footerRef.current && !footerRef.current.contains(event.target as Node)) {
        setExpandedSection(null); // Collapse the expanded section
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
        backgroundColor: 'white',
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
          borderBottom: '1px solid #ddd',
        }}
      >
        {sections.map((section) => (
          <Box
            key={section.id}
            sx={{
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer',
              padding: '10px',
              backgroundColor: expandedSection === section.id ? '#f5f5f5' : 'white',
              transition: 'background-color 0.3s',
            }}
            onClick={() => handleSectionClick(section.id)}
          >
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              borderBottom={expandedSection === section.id ? '2px solid #1976d2' : 'none'}
            >
              {section.title}
            </Typography>
          </Box>
        ))}
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
