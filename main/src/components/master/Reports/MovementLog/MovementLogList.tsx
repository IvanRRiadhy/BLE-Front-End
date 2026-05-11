import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid2 as Grid,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Divider,
  TableContainer,
  MenuItem,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'src/store/Store';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { IconRefresh } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllReaders } from 'src/hooks/useReader';

const columns = [
  { label: 'Person Name', field: 'personName' },
  { label: 'Person ID', field: 'personId' },
  { label: 'Person Type', field: 'personType' },
  { label: 'Card Number', field: 'cardNumber' },
  { label: 'Beacon ID', field: 'beaconId' },
  { label: 'Nearest Reader', field: 'firstReaderId' },
  { label: 'Area', field: 'area' },
  { label: 'Floor', field: 'floor' },
  { label: 'Building', field: 'building' },
  { label: 'Last Detected Time', field: 'lastDetectedTime' },
];

const MovementLogList = () => {
  const { t } = useTranslation();
  const beaconsByTopic = useSelector((state: RootState) => state.BeaconReducer.allBeacons);
  // console.log("Beacons" , beaconsByTopic);
  const { data: visitorsData = [], refetch: refetchVisitors, isFetching: isFetchingVisitors } = useAllVisitor();
  const { data: membersData = [], refetch: refetchMembers, isFetching: isFetchingMembers } = useAllMembers();
  const { data: securityData = [], refetch: refetchSecurity, isFetching: isFetchingSecurity } = useAllSecuritys();
  const { data: readerData = []} = useAllReaders();

  const isFetching = isFetchingVisitors || isFetchingMembers || isFetchingSecurity;

  const { data: floorplansData = [] } = useAllFloorplans();

  const visitorMap = new Map(visitorsData.map((v) => [v.id?.toLowerCase(), v]));
  const memberMap = new Map(membersData.map((m) => [m.id?.toLowerCase(), m]));
  const securityMap = new Map(securityData.map((s) => [s.id?.toLowerCase(), s]));
  const floorplanMap = new Map(floorplansData.map((f) => [f.id?.toLowerCase(), f]));

  const [filterName, setFilterName] = useState('');
  const [filterPersonId, setFilterPersonId] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Visitor' | 'Member' | 'Security'>('ALL');

  const processedData = useMemo(() => {
    // Keys in beaconsByTopic are now floorplanIds (as set in fetchBeacon)
    const trackingTopics = Object.keys(beaconsByTopic);
    // console.log("Beacons: ", beaconsByTopic)
    const acc: Record<string, any> = {};

    trackingTopics.forEach((topic) => {
      const beacons = beaconsByTopic[topic] || {};
      Object.values(beacons).forEach((beacon: any) => {
        const key = beacon.dmac || beacon.beaconId || beacon.cardNumber;
        if (!key) return;

        const existing = acc[key];
        if (!existing || (beacon.lastSeen ?? new Date(beacon.time).getTime()) > (existing.lastSeen ?? new Date(existing.time).getTime())) {
          acc[key] = beacon;
        }
      });
    });

    return Object.values(acc).map((beacon: any) => {
      const visitor = beacon.visitorCardId ? visitorMap.get(beacon.visitorCardId.toLowerCase()) : null;
      const member = beacon.memberCardId ? memberMap.get(beacon.memberCardId.toLowerCase()) : null;
      const security = beacon.securityCardId ? securityMap.get(beacon.securityCardId.toLowerCase()) : null;
      const floorplan = beacon.floorplanId ? floorplanMap.get(beacon.floorplanId.toLowerCase()) : null;

      const personType = visitor ? 'Visitor' : member ? 'Member' : security ? 'Security' : 'Unknown';
      const personName = visitor?.name || member?.name || security?.name || beacon.cardName || 'Unknown';
      const personId = visitor?.personId || member?.personId || security?.personId || '-';
      const cardNumber = visitor?.cardNumber || member?.cardNumber || security?.cardNumber || beacon.cardNumber || '-';

      return {
        personName,
        personId,
        personType,
        cardNumber,
        beaconId: beacon.beaconId || beacon.dmac || '-',
        firstReaderId: beacon.firstReaderId || '-',
        area: beacon.maskedAreaName || 'Unknown Area',
        floor: floorplan?.floor?.name || beacon.floorplanName || '-',
        building: floorplan?.floor?.building?.name || beacon.buildingName || '-',
        lastDetectedTime: beacon.time || '-',
        lastSeen: beacon.lastSeen,
      };
    });
  }, [beaconsByTopic, visitorMap, memberMap, securityMap, floorplanMap]);

  const filteredData = useMemo(() => {
    return processedData.filter((row) => {
      if (filterName && !row.personName.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterPersonId && !row.personId.toLowerCase().includes(filterPersonId.toLowerCase())) return false;
      if (filterType !== 'ALL' && row.personType !== filterType) return false;
      return true;
    }).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  }, [processedData, filterName, filterPersonId, filterType]);

  const handleRefresh = () => {
    refetchVisitors();
    refetchMembers();
    refetchSecurity();
  };

  const formatTime = (isoString: string) => {
    if (!isoString || isoString === '-') return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getReaderName = (readerId: string) => {
    const reader = readerData.find((r) => r.id.toUpperCase() === readerId.toUpperCase());
    return reader?.name || reader?.gmac || readerId;
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
          <BlankCard>
            <Box p={2}>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid size={{ xs: 12, sm: 3 }}>
                  <CustomTextField
                    fullWidth
                    label="Person Name"
                    placeholder="Search by name..."
                    value={filterName}
                    onChange={(e: any) => setFilterName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <CustomTextField
                    fullWidth
                    label="Person ID"
                    placeholder="Search by ID..."
                    value={filterPersonId}
                    onChange={(e: any) => setFilterPersonId(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label="Person Type"
                    value={filterType}
                    onChange={(e: any) => setFilterType(e.target.value as any)}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    <MenuItem value="Member">Member</MenuItem>
                    <MenuItem value="Visitor">Visitor</MenuItem>
                    <MenuItem value="Security">Security</MenuItem>
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setFilterName('');
                        setFilterPersonId('');
                        setFilterType('ALL');
                      }}
                    >
                      Reset Filter
                    </Button>
                    <Tooltip title="Refresh Data">
                      <IconButton color="primary" onClick={handleRefresh} disabled={isFetching}>
                        <Box
                          sx={{
                            display: 'flex',
                            animation: isFetching ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' },
                            },
                          }}
                        >
                          <IconRefresh size={20} />
                        </Box>
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Divider />
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader aria-label="movement log table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.label}>
                        <Typography variant="h6">{col.label}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        <Typography variant="body1" sx={{ p: 3 }}>
                          No movement logs found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          backgroundColor: index % 2 === 0 ? 'background.default' : 'background.paper',
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{row.personName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.personId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.personType}
                            size="small"
                            color={
                              row.personType === 'Member' ? 'primary' :
                              row.personType === 'Visitor' ? 'secondary' :
                              row.personType === 'Security' ? 'success' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.cardNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.beaconId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{getReaderName(row.firstReaderId) || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.area}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.floor}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.building}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatTime(row.lastDetectedTime)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default MovementLogList;
