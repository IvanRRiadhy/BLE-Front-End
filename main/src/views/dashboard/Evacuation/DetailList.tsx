import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  TableContainer,
  Table,
  Paper,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
} from '@mui/material';

const confirmedEvacuated = 15;
const nonConfirmed = 5;

// Dummy data, replace with your real visitor data
const remainingVisitors = [
  {
    id: 1,
    name: 'Rudi Santoso',
    cardNumber: '12345678',
    faceUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastDetected: {
      area: 'Lobby',
      floor: '1',
      building: 'A',
      timestamp: '2025-07-27 09:01:22',
    },
  },
  {
    id: 2,
    name: 'Lisa Aditya',
    cardNumber: '98375421',
    faceUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastDetected: {
      area: 'Meeting Room',
      floor: '2',
      building: 'A',
      timestamp: '2025-07-27 08:51:07',
    },
  },
  {
    id: 3,
    name: 'Rudi Santoso',
    cardNumber: '12345678',
    faceUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastDetected: {
      area: 'Lobby',
      floor: '1',
      building: 'A',
      timestamp: '2025-07-27 09:01:22',
    },
  },
  {
    id: 4,
    name: 'Lisa Aditya',
    cardNumber: '98375421',
    faceUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastDetected: {
      area: 'Meeting Room',
      floor: '2',
      building: 'A',
      timestamp: '2025-07-27 08:51:07',
    },
  },
  {
    id: 5,
    name: 'Rudi Santoso',
    cardNumber: '12345678',
    faceUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastDetected: {
      area: 'Lobby',
      floor: '1',
      building: 'A',
      timestamp: '2025-07-27 09:01:22',
    },
  },
  {
    id: 6,
    name: 'Lisa Aditya',
    cardNumber: '98375421',
    faceUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastDetected: {
      area: 'Meeting Room',
      floor: '2',
      building: 'A',
      timestamp: '2025-07-27 08:51:07',
    },
  },
  {
    id: 7,
    name: 'Rudi Santoso',
    cardNumber: '12345678',
    faceUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastDetected: {
      area: 'Lobby',
      floor: '1',
      building: 'A',
      timestamp: '2025-07-27 09:01:22',
    },
  },
  {
    id: 8,
    name: 'Lisa Aditya',
    cardNumber: '98375421',
    faceUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastDetected: {
      area: 'Meeting Room',
      floor: '2',
      building: 'A',
      timestamp: '2025-07-27 08:51:07',
    },
  },
  {
    id: 9,
    name: 'Rudi Santoso',
    cardNumber: '12345678',
    faceUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastDetected: {
      area: 'Lobby',
      floor: '1',
      building: 'A',
      timestamp: '2025-07-27 09:01:22',
    },
  },
  {
    id: 10,
    name: 'Lisa Aditya',
    cardNumber: '98375421',
    faceUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastDetected: {
      area: 'Meeting Room',
      floor: '2',
      building: 'A',
      timestamp: '2025-07-27 08:51:07',
    },
  },

  // ... more data
];

const DetailList: React.FC = () => (
  <Card
    sx={{
      minWidth: 260,
      minHeight: '80vh',
      p: 3,
      borderRadius: 4,
      boxShadow: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      bgcolor: '#fff',
      mx: 0,
    }}
  >
    <CardContent sx={{ width: '100%', textAlign: 'center', px: 0 }}>
      {/* <Typography variant="h6" fontWeight={700} mb={4}>
        Left Card
      </Typography> */}
      <Stack
        direction="row"
        spacing={3}
        justifyContent="center"
        alignItems="flex-start"
        width="100%"
        mb={4}
      >
        {/* Confirmed Evacuated */}
        <Box
          sx={{
            width: '50%',
            minWidth: 120,
            maxWidth: 180,
            aspectRatio: '1/1', // Keep it square
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            boxShadow: 1,
            bgcolor: 'rgba(0, 255, 213, 0.08)',
            border: '2px solid',
            borderColor: 'success.light',
            mb: 2,
          }}
        >
          <Typography variant="h5" fontWeight={1000} color="success.main" mb={1}>
            Confirmed Evacuated
          </Typography>
          <Typography variant="h1" fontWeight={800} color="success.main">
            {confirmedEvacuated}
          </Typography>
        </Box>
        {/* Not Confirmed */}
        <Box
          sx={{
            width: '50%',
            minWidth: 120,
            maxWidth: 180,
            aspectRatio: '1/1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            boxShadow: 1,
            bgcolor: 'rgba(255, 88, 44, 0.08)',
            border: '2px solid',
            borderColor: 'error.light',
          }}
        >
          <Typography variant="h5" fontWeight={1000} color="error.main" mb={1}>
            Not Confirmed
          </Typography>
          <Typography variant="h1" fontWeight={800} color="error.main">
            {nonConfirmed}
          </Typography>
        </Box>
      </Stack>
    </CardContent>

    {/* Visitor List Scrollable */}
      <Box sx={{ mt: 2, width: '100%' }}>
        <List disablePadding sx={{ width: '100%', border: '1px solid #ccc', borderRadius: 2 }}>
          <Box sx={{ mt: 2, width: '100%' }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ px: 2, mb: 1, textAlign: 'left' }}
            >
              Remaining Visitor
            </Typography>
            <TableContainer
              component={Paper}
              sx={{
                boxShadow: 2,
                borderRadius: 2,
                maxHeight: 355, // set your preferred height
                overflow: 'auto',
              }}
            >
              <Table size="small" stickyHeader aria-label="evacuated visitor table">
                <TableHead>
                  <TableRow>
                    <TableCell align="left" sx={{ fontWeight: 700, width: 140 }}>
                      Visitor
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                      Last Detected Area
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {remainingVisitors.map((visitor) => (
                    <TableRow key={visitor.id} hover>
                      <TableCell
                        align="left"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid #eee',
                        }}
                      >
                        <Avatar
                          src={visitor.faceUrl}
                          alt={visitor.name}
                          sx={{ width: 38, height: 38, mr: 1 }}
                        />
                        <Box>
                          <Typography fontWeight={700} fontSize={16} align="left">
                            {visitor.name}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary" align="left">
                            Card #{visitor.cardNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{  width: 140 }}>
                        <Typography fontSize={13} color="text.secondary">
                          {visitor.lastDetected.area} – Flr {visitor.lastDetected.floor} – Bldg{' '}
                          {visitor.lastDetected.building}
                        </Typography>
                        <Typography fontSize={12} color="text.disabled">
                          {visitor.lastDetected.timestamp}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {remainingVisitors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.disabled' }}>
                        No confirmed evacuated visitors.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </List>
      </Box>
  </Card>
);

export default DetailList;
