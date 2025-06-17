import React from 'react';
import { Box, Button, Typography, Modal, Backdrop, Fade } from '@mui/material';
import { useNavigate } from 'react-router';

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 320,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  outline: 'none',
  textAlign: 'center' as const,
};

interface SessionExpProps {
  open: boolean;
}

const SessionExp: React.FC<SessionExpProps> = ({ open }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/auth/login');
  };

  return (
    <Modal
      open={open}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-description"
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <Typography id="session-expired-title" variant="h6" gutterBottom>
            Login Session Expired
          </Typography>
          <Typography id="session-expired-description" sx={{ mb: 3 }}>
            Your login session has expired. Please login again.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleLogin}>
            Go to Login
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
};

export default SessionExp;