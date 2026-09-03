import React, { useState, useMemo, useEffect } from 'react';
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
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { IconRefresh } from '@tabler/icons-react';
import { RootState } from 'src/store/Store';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllReaders } from 'src/hooks/useReader';
import { downloadMovementLogExcel } from 'src/utils/exportMovementLog';

export type BeaconMovementStatus = 'Moving' | 'Stay' | 'Lost';

const columns = [
  { label: 'Person Name', field: 'personName' },
  { label: 'Status', field: 'status', sortable: true },
  { label: 'Person ID', field: 'personId' },
  { label: 'Person Type', field: 'personType' },
  { label: 'Card Number', field: 'cardNumber', sortable: true },
  { label: 'Beacon ID', field: 'beaconId' },
  { label: 'Nearest Reader', field: 'firstReaderId' },
  { label: 'Area', field: 'area', sortable: true },
  { label: 'Floor', field: 'floor', sortable: true },
  { label: 'Building', field: 'building', sortable: true },
  { label: 'Last Detected Time', field: 'lastDetectedTime', sortable: true },
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

  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [filterName, setFilterName] = useState('');
  const [filterPersonId, setFilterPersonId] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Visitor' | 'Member' | 'Security'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Moving' | 'Stay' | 'Lost'>('ALL');

  const [orderBy, setOrderBy] = useState<string>('lastDetectedTime');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const getTimestamp = (b: any): number => {
    if (!b) return 0;
    if (typeof b.lastSeen === 'number') return b.lastSeen;
    if (b.lastSeen) {
      const ms = new Date(b.lastSeen).getTime();
      if (!isNaN(ms)) return ms;
    }
    if (b.time) {
      const ms = new Date(b.time).getTime();
      if (!isNaN(ms)) return ms;
    }
    return 0;
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
        if (!existing || getTimestamp(beacon) > getTimestamp(existing)) {
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

      const detectedTimestamp = getTimestamp(beacon);
      const age = detectedTimestamp > 0 ? currentTime - detectedTimestamp : Infinity;

      let status: BeaconMovementStatus = 'Lost';
      if (age <= 3000) {
        status = 'Moving';
      } else if (age <= 150000) {
        status = 'Stay';
      } else {
        status = 'Lost';
      }

      return {
        personName,
        personId,
        personType,
        cardNumber,
        status,
        beaconId: beacon.beaconId || beacon.dmac || '-',
        firstReaderId: beacon.firstReaderId || '-',
        area: beacon.maskedAreaName || 'Unknown Area',
        floor: floorplan?.floor?.name || beacon.floorplanName || '-',
        building: floorplan?.floor?.building?.name || beacon.buildingName || '-',
        lastDetectedTime: beacon.time || '-',
        lastSeen: beacon.lastSeen,
        detectedTimestamp,
      };
    });
  }, [beaconsByTopic, visitorMap, memberMap, securityMap, floorplanMap, currentTime]);

  const filteredData = useMemo(() => {
    const filtered = processedData.filter((row) => {
      if (filterName && !row.personName.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterPersonId && !row.personId.toLowerCase().includes(filterPersonId.toLowerCase())) return false;
      if (filterType !== 'ALL' && row.personType !== filterType) return false;
      if (filterStatus !== 'ALL' && row.status !== filterStatus) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let aVal = a[orderBy as keyof typeof a];
      let bVal = b[orderBy as keyof typeof b];

      // Special handling for lastDetectedTime or lastSeen
      if (orderBy === 'lastDetectedTime') {
        aVal = a.detectedTimestamp || 0;
        bVal = b.detectedTimestamp || 0;
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
  }, [processedData, filterName, filterPersonId, filterType, filterStatus, orderBy, order]);

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

  const handleExportExcel = () => {
    const exportData = filteredData.map((row) => ({
      personName: row.personName,
      status: row.status,
      personId: row.personId,
      personType: row.personType,
      cardNumber: row.cardNumber,
      beaconId: row.beaconId,
      readerName: getReaderName(row.firstReaderId) || '-',
      area: row.area,
      floor: row.floor,
      building: row.building,
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
                <Grid size={{ xs: 12, sm: 2.5 }}>
                  <CustomTextField
                    fullWidth
                    label="Person Name"
                    placeholder="Search by name..."
                    value={filterName}
                    onChange={(e: any) => setFilterName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2.5 }}>
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
                    label="Status"
                    value={filterStatus}
                    onChange={(e: any) => setFilterStatus(e.target.value as any)}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    <MenuItem value="Moving">Moving</MenuItem>
                    <MenuItem value="Stay">Stay</MenuItem>
                    <MenuItem value="Lost">Lost</MenuItem>
                  </CustomTextField>
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
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setFilterName('');
                        setFilterPersonId('');
                        setFilterType('ALL');
                        setFilterStatus('ALL');
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
              <Box mt={2} display="flex" justifyContent="flex-start">
                <Chip
                  label={`Showing: ${filteredData.length} rows / beacons`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
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
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{row.personName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status}
                            size="small"
                            color={
                              row.status === 'Moving' ? 'success' :
                              row.status === 'Stay' ? 'warning' : 'default'
                            }
                          />
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
