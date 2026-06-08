import { Box } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface ScrollArrowButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
  visible: boolean;
}

const ScrollArrowButton: React.FC<ScrollArrowButtonProps> = ({ 
  direction, 
  onClick, 
  visible 
}) => {
  if (!visible) return null;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'absolute',
        [direction === 'left' ? 'left' : 'right']: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        width: 48,
        height: "18vh",
        borderRadius: 2,
        border: '2px solid #aaa',
        bgcolor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 32,
        color: '#777',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: '#f0f0f0',
          borderColor: '#888',
          color: '#555',
          transform: 'translateY(-50%) scale(1.05)',
        },
        '&:active': {
          transform: 'translateY(-50%) scale(0.95)',
        }
      }}
    >
      {direction === 'left' ? <ChevronLeft fontSize="inherit" /> : <ChevronRight fontSize="inherit" />}
    </Box>
  );
};

export default ScrollArrowButton;