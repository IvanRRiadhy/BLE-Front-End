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
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'src/store/Store';
import CustomTextField from 'src/components/shared/CustomTextField';
import { IconRefresh } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
// Hooks removed to avoid API fetching and 401 Unauthorized errors
import { downloadMovementLogExcel } from 'src/utils/exportMovementLog';
import { useAllBuilding, useAllFloor, useAllFloorplan } from 'src/hooks/dataFetch';

const columns = [
  { label: 'Person Name', field: 'personName' },
  // { label: 'Person ID', field: 'personId' },
  { label: 'Person Type', field: 'personType' },
  { label: 'Card Number', field: 'cardNumber', sortable: true },
  { label: 'Beacon ID', field: 'beaconId' },
  { label: 'Nearest Reader', field: 'firstReaderId' },
  { label: 'Area', field: 'area', sortable: true },
  { label: 'Floor', field: 'floor', sortable: true },
  { label: 'Building', field: 'building', sortable: true },
  { label: 'Site Name', field: 'siteName', sortable: true },
  { label: 'Last Detected Time', field: 'lastDetectedTime', sortable: true },
];

const MovementLogList = () => {
  const { t } = useTranslation();
  const beaconsByTopic = useSelector((state: RootState) => state.BeaconReducer.allBeacons);
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  // console.log("Beacons" , beaconsByTopic);
  // Dummy data to replace backend API fetching
  const visitorsData = [{ id: 'dummy-v1', personId: 'V-001', name: 'John Doe (Dummy)', cardNumber: '12345' }];
  const membersData = [{ id: 'dummy-m1', personId: 'M-001', name: 'Jane Smith (Dummy)', cardNumber: '54321' }];
  const securityData = [{ id: 'dummy-s1', personId: 'S-001', name: 'Guard Bob (Dummy)', cardNumber: '99999' }];
  const floorplansData = [{ id: 'dummy-f1', floor: { name: 'Level 1 (Dummy)', building: { name: 'Main Tower' } } }];
  const readerData = [{ id: 'dummy-r1', name: 'Main Gate Reader', gmac: 'AA:BB:CC:DD' }];

  const isFetching = false;

  const visitorMap = new Map(visitorsData.map((v) => [v.id?.toLowerCase(), v]));
  const memberMap = new Map(membersData.map((m) => [m.id?.toLowerCase(), m]));
  const securityMap = new Map(securityData.map((s) => [s.id?.toLowerCase(), s]));
  const floorplanData = useAllFloorplan().data ?? [];
  const floorplanMap = new Map(floorplanData.map((f) => [f.id?.toLowerCase(), f]));
  const floorData = useAllFloor().data ?? [];
  const floorMap = new Map(floorData.map((f) => [f.id?.toLowerCase(), f]));
  const buildingData = useAllBuilding().data ?? [];
  const buildingMap = new Map(buildingData.map((b) => [b.id?.toLowerCase(), b]));

  const [filterName, setFilterName] = useState('');
  const [filterPersonId, setFilterPersonId] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Visitor' | 'Member' | 'Security'>('ALL');

  const [orderBy, setOrderBy] = useState<string>('lastDetectedTime');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

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
    // console.log("Tracking: ", acc)
    return Object.values(acc).map((beacon: any) => {
      const visitor = beacon.visitorCardName ?? null;
      const member = beacon.memberCardName ?? null;
      const security = beacon.securityCardName ?? null;
      const floorplan = beacon.floorplanId ? floorplanMap.get(beacon.floorplanId.toLowerCase()) : null;
      const floor = beacon.floorId ? floorMap.get(beacon.floorId.toLowerCase()) : floorplan ? floorMap.get(floorplan.floorId.toLowerCase()) : null;
      const building = beacon.buildingId ? buildingMap.get(beacon.buildingId.toLowerCase()) : floor ? buildingMap.get(floor.buildingId.toLowerCase()) : null;

      const personType = beacon.personCategory ? beacon.personCategory : visitor ? 'Visitor' : member ? 'Member' : security ? 'Security' : 'Unknown';
      const personName = visitor || member || security || beacon.cardName || 'Unknown';
      // const personId = visitor?.personId || member?.personId || security?.personId || '-';
      const cardNumber = visitor?.cardNumber || member?.cardNumber || security?.cardNumber || beacon.cardNumber || '-';
      // console.log("Floorplan: ", beacon)
      // console.log("Floor: ", floor)
      // console.log("Building: ", building)
      return {
        personName,
        // personId,
        personType,
        cardNumber,
        beaconId: beacon.beaconId || beacon.dmac || '-',
        firstReaderId: beacon.first || '-',
        area: beacon.maskedAreaName || 'Unknown Area',
        floor: floor?.name || beacon.floorplanName || beacon.floorName || '-',
        building: building?.name || beacon.buildingName || '-',
        siteName: building?.siteName || floor?.siteName || floorplan?.siteName || beacon.siteName || '-',
        lastDetectedTime: beacon.time || '-',
        lastSeen: beacon.lastSeen,
      };
    });
  }, [beaconsByTopic, visitorMap, memberMap, securityMap, floorplanMap, floorMap, buildingMap]);

  const filteredData = useMemo(() => {
    const filtered = processedData.filter((row) => {
      if (followingPerson) {
        const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const targetBle = normalize(followingPerson.bleCardNumber);
        const rowBle = normalize(row.beaconId);
        let isMatch = false;
        if (targetBle && rowBle && targetBle === rowBle) {
          isMatch = true;
        } else if (followingPerson.name && row.personName && row.personName.toLowerCase() === followingPerson.name.toLowerCase()) {
          isMatch = true;
        }
        if (!isMatch) return false;
      }

      if (filterName && !row.personName.toLowerCase().includes(filterName.toLowerCase())) return false;
      // if (filterPersonId && !row.personId.toLowerCase().includes(filterPersonId.toLowerCase())) return false;
      if (filterType !== 'ALL' && row.personType !== filterType) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let aVal = a[orderBy as keyof typeof a];
      let bVal = b[orderBy as keyof typeof b];

      // Special handling for lastDetectedTime or lastSeen
      if (orderBy === 'lastDetectedTime') {
        aVal = a.lastSeen || (a.lastDetectedTime !== '-' ? new Date(a.lastDetectedTime).getTime() : 0);
        bVal = b.lastSeen || (b.lastDetectedTime !== '-' ? new Date(b.lastDetectedTime).getTime() : 0);
      }

      // Convert values to string for generic comparison if they are not already numbers
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
      }
      if (typeof bVal === 'string') {
        bVal = bVal.toLowerCase();
      }

      if (aVal === undefined || aVal === null || aVal === '-') return order === 'asc' ? 1 : -1;
      if (bVal === undefined || bVal === null || bVal === '-') return order === 'asc' ? -1 : 1;

      if (aVal < bVal) {
        return order === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [processedData, filterName, filterPersonId, filterType, orderBy, order]);

  const handleRefresh = () => {
    console.log("Dummy refresh triggered");
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

  const handleExportExcel = () => {
    const exportData = filteredData.map((row) => ({
      personName: row.personName,
      // personId: row.personId,
      personType: row.personType,
      cardNumber: row.cardNumber,
      beaconId: row.beaconId,
      readerName: getReaderName(row.firstReaderId) || '-',
      area: row.area,
      floor: row.floor,
      building: row.building,
      siteName: row.siteName,
      formattedTime: formatTime(row.lastDetectedTime),
    }));
    downloadMovementLogExcel(exportData);
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
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleExportExcel}
                    >
                      Export XLS
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
              <Box mt={2} display="flex" justifyContent="flex-start" gap={1}>
                <Chip
                  label={`Showing: ${filteredData.length} rows / beacons`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                {followingPerson && (
                  <Chip
                    label={`Follow Filter Active: ${followingPerson.name}`}
                    color="secondary"
                    variant="filled"
                    size="small"
                  />
                )}
              </Box>
            </Box>

            <Divider />
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader aria-label="movement log table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.label}>
                        {col.sortable ? (
                          <TableSortLabel
                            active={orderBy === col.field}
                            direction={orderBy === col.field ? order : 'desc'}
                            onClick={() => handleSort(col.field)}
                          >
                            <Typography variant="h6">{col.label}</Typography>
                          </TableSortLabel>
                        ) : (
                          <Typography variant="h6">{col.label}</Typography>
                        )}
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
                          position: 'relative',
                          // transition: 'background-color 0.3s ease',
                          // animation: (row.lastSeen && (Date.now() - row.lastSeen) < 15000) ? 'breathe-blue 3s infinite ease-in-out' : 'none',
                          // '@keyframes breathe-blue': {
                          //   '0%': { backgroundColor: index % 2 === 0 ? 'background.default' : 'background.paper' },
                          //   '50%': { backgroundColor: 'rgba(0, 155, 255, 0.07)' },
                          //   '100%': { backgroundColor: index % 2 === 0 ? 'background.default' : 'background.paper' },
                          // },
                          // '&:hover': {
                          //   backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                          // }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{row.personName}</Typography>
                        </TableCell>
                        {/* <TableCell>
                          <Typography variant="body2">{row.personId}</Typography>
                        </TableCell> */}
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
                          <Typography variant="body2">{row.siteName}</Typography>
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
