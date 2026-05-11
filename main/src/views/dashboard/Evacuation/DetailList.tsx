import React, { useEffect, useState } from 'react';
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
  Chip,
} from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { updateEvacuationData } from 'src/store/apps/tracking/Evacuation';
import EvacuationList from './EvacuationList';

const DetailList: React.FC = () => {
  const dispatch = useDispatch();
  const { evacuationId, data, evacState } = useSelector((state) => state.evacuationReducer);
  const summary = data?.summary;
  const persons = data?.persons || [];

  if (evacState === 'idle') {
    return <EvacuationList />;
  }


  return (
    <Card
      sx={{
        minWidth: 260,
        height: '100%',
        p: 3,
        borderRadius: 4,
        boxShadow: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.paper',
        mx: 0,
        overflowY: 'auto',
        border: '1px solid #E0E0E0',
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
          {/* Confirmed */}
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
              Confirmed
            </Typography>
            <Typography variant="h1" fontWeight={800} color="success.main">
              {summary?.totalConfirmedNotification || 0}
            </Typography>
          </Box>
          {/*  Evacuated */}
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
              bgcolor: 'rgba(95, 171, 241, 0.08)',
              border: '2px solid',
              borderColor: 'primary.light',
              mb: 2,
            }}
          >
            <Typography variant="h5" fontWeight={1000} color="primary.main" mb={1}>
              Evacuated
            </Typography>
            <Typography variant="h1" fontWeight={800} color="primary.main">
              {summary?.totalEvacuated || 0}
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
              {summary?.totalRemaining || 0}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      {/* Visitor List Scrollable */}
      <Box sx={{ mt: 2, width: '100%' }}>
        <List
          disablePadding
          sx={{ width: '100%', border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
        >
          <Box sx={{ mt: 2, width: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ px: 2, mb: 1, textAlign: 'left' }}>
              Remaining Persons
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
                      Person
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>
                      Status
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                      Last Detected Area
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {persons.map((person) => {
                    let chipColor: "success" | "primary" | "warning" | "error" = 'error';
                    if (person.personStatus === 'ConfirmedEvacuated') chipColor = 'success';
                    else if (person.personStatus === 'Evacuated') chipColor = 'primary';
                    else if (person.personStatus === 'ConfirmedAlertNotification') chipColor = 'warning';
                    
                    return (
                                          <TableRow key={person.transactionId} hover>
                      <TableCell
                        align="left"
                        sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}` }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            src={""}
                            alt={person.personName}
                            sx={{ width: 38, height: 38, mr: 1 }}
                          />
                          <Box>
                            <Typography fontWeight={700} fontSize={16} align="left">
                              {person.personName}
                            </Typography>
                            <Typography fontSize={12} color="text.secondary" align="left">
                              Card #{person.card.cardNumber}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ borderRight: (theme) => `1px solid ${theme.palette.divider}`, width: 100 }}
                      >
                        <Chip
                          label={person.personStatus}
                          color={chipColor}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ width: 140 }}>
                        <Typography fontSize={13} color="text.secondary">
                          {person.position ? `${person.position.areaName} – ${person.position.floorName} – ${person.position.buildingName}` : 'No Signal'}
                        </Typography>
                        <Typography fontSize={12} color="text.disabled">
                          {person.position?.lastDetected ? new Date(person.position.lastDetected).toLocaleString() : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                  {persons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.disabled' }}>
                        No persons currently tracked.
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
};

export default DetailList;
