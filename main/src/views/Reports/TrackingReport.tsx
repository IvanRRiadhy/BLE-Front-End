import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import {
  Box,
  Grid2 as Grid,
  Typography,
  Stack,
  Button,
  IconButton,
  Paper,
  Divider,
  MenuItem,
  TextField,
  Autocomplete,
  FormControl,
  Select,
  CircularProgress,
} from '@mui/material';
import {
  IconDownload,
  IconDotsVertical,
  IconRefresh,
} from '@tabler/icons-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import PageContainer from 'src/components/container/PageContainer';
import TrackingReportTopCard from 'src/components/master/Reports/TrackingReport/TrackingReportTopCard';
import TrackingReportPeakHour from 'src/components/master/Reports/TrackingReport/TrackingReportPeakHour';
import TrackingReportByArea from 'src/components/master/Reports/TrackingReport/TrackingReportByArea';
import TrackingReportByPeople from 'src/components/master/Reports/TrackingReport/TrackingReportByPeople';
import TrackingReportDetail, { UnifiedTrackingRow } from 'src/components/master/Reports/TrackingReport/TrackingReportDetail';
import TrackingReportSinglePerson from 'src/components/master/Reports/TrackingReport/TrackingReportSinglePerson';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

import { useVisitorSession } from 'src/hooks/useVisitorSession';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllMembers } from 'src/hooks/useMember';
import { OldGetFilter } from 'src/store/apps/crud/visitorSession';
import { BASE_URL } from 'src/utils/axios';

const AutocompleteFilter = lazy(
  () => import('src/layouts/full/horizontal/navbar/AutocompleteFilter'),
);

const TrackingReport: React.FC = () => {
  const { mutate: fetchVisitorSession, data: sessionData, isPending: isLoading } = useVisitorSession();

  // Data Hooks for Filters
  const buildingList = useAllBuilding().data ?? [];
  const floorList = useAllFloors().data ?? [];
  const floorplanList = useAllFloorplans().data ?? [];
  const maskedAreaList = useAllMaskedAreas().data ?? [];
  const visitorList = useAllVisitor().data ?? [];
  const memberList = useAllMembers().data ?? [];

  // Automatically detect device timezone
  const deviceTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
    } catch {
      return 'Asia/Jakarta';
    }
  }, []);

  // Filter Form State
  const [timeRange, setTimeRange] = useState<string>('daily');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [appliedAreaFilter, setAppliedAreaFilter] = useState<{
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  }>({
    BuildingId: [],
    FloorId: [],
    FloorplanId: [],
    MaskedAreaId: [],
  });

  const [personType, setPersonType] = useState<'all' | 'visitor' | 'member'>('all');
  const [selectedVisitorIds, setSelectedVisitorIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(dayjs().format('DD MMM YYYY HH:mm:ss'));

  // Applied Person Filter state (only updated on Apply / Reset)
  const [appliedPersonFilter, setAppliedPersonFilter] = useState<{
    personType: 'all' | 'visitor' | 'member';
    selectedVisitorIds: string[];
    selectedMemberIds: string[];
  }>({
    personType: 'all',
    selectedVisitorIds: [],
    selectedMemberIds: [],
  });

  // Applied Time Filter state (only updated on Apply / Reset)
  const [appliedTimeFilter, setAppliedTimeFilter] = useState<{
    timeRange: string;
    fromDate: string | null;
    toDate: string | null;
  }>({
    timeRange: 'daily',
    fromDate: null,
    toDate: null,
  });

  // Formatted Visitor / Member Autocomplete Options
  const visitorOptions = useMemo(() => {
    return visitorList.map((v: any) => ({
      id: v.id,
      name: v.name || v.visitorName || 'Unknown Visitor',
    }));
  }, [visitorList]);

  const memberOptions = useMemo(() => {
    return memberList.map((m: any) => ({
      id: m.id,
      name: m.name || m.memberName || 'Unknown Member',
    }));
  }, [memberList]);

  // Selected Person Detail override (when clicking Person Detail from row three-dots menu)
  const [selectedPersonDetailRow, setSelectedPersonDetailRow] = useState<UnifiedTrackingRow | null>(null);

  const handleViewPersonDetail = (row: UnifiedTrackingRow) => {
    setSelectedPersonDetailRow(row);
  };

  // Detect single member or visitor selected/filtered (using APPLIED filter state or menu selection)
  const isSinglePersonSelected = useMemo(() => {
    if (selectedPersonDetailRow) return true;
    if (appliedPersonFilter.personType === 'visitor' && appliedPersonFilter.selectedVisitorIds.length === 1) return true;
    if (appliedPersonFilter.personType === 'member' && appliedPersonFilter.selectedMemberIds.length === 1) return true;

    const sessionList: any[] = Array.isArray(sessionData)
      ? sessionData
      : Array.isArray((sessionData as any)?.collection?.data)
      ? (sessionData as any).collection.data
      : Array.isArray((sessionData as any)?.data)
      ? (sessionData as any).data
      : [];

    if (sessionList.length > 0) {
      const uniquePersons = new Set(
        sessionList
          .filter((s) => s.personType?.toLowerCase() !== 'security')
          .map((s) => s.personId || s.visitorId || s.memberId || s.personName)
      );
      if (uniquePersons.size === 1) return true;
    }
    return false;
  }, [selectedPersonDetailRow, appliedPersonFilter, sessionData]);

  const selectedPersonInfo = useMemo(() => {
    if (!isSinglePersonSelected) return null;

    if (selectedPersonDetailRow) {
      const isVisitor = selectedPersonDetailRow.personType?.toLowerCase() === 'visitor';
      const pName = selectedPersonDetailRow.personName;
      const list = isVisitor ? visitorList : memberList;
      const found: any = list.find(
        (item: any) =>
          item.name?.toLowerCase() === pName.toLowerCase() ||
          item.visitorName?.toLowerCase() === pName.toLowerCase() ||
          item.memberName?.toLowerCase() === pName.toLowerCase()
      );

      return {
        id: found?.id || selectedPersonDetailRow.cardNumber || '1',
        name: pName,
        type: (isVisitor ? 'visitor' : 'member') as 'visitor' | 'member',
        identityId: found?.identityId || found?.nik || pName.toLowerCase().replace(/\s+/g, ''),
        cardNumber: selectedPersonDetailRow.cardNumber || found?.cardNumber || found?.cardId || 'G-677043',
        email: found?.email || `${pName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: found?.phone || '+62 812 3456 7890',
        organization: found?.companyName || found?.organization?.name || found?.department?.name || selectedPersonDetailRow.hostName || 'PT. Masela',
        avatarUrl: found?.faceImage ? (found.faceImage.startsWith('http') ? found.faceImage : `${BASE_URL}/${found.faceImage}`) : undefined,
      };
    }

    if (appliedPersonFilter.personType === 'member' && appliedPersonFilter.selectedMemberIds.length === 1) {
      const memId = appliedPersonFilter.selectedMemberIds[0];
      const m: any = memberList.find((item: any) => item.id === memId || item.memberId === memId);
      if (m) {
        return {
          id: m.id || memId,
          name: m.name || m.memberName || 'Vance Woolsey',
          type: 'member' as const,
          identityId: m.identityId || m.nik || 'vwoolsey',
          cardNumber: m.cardNumber || m.bleCardNumber || m.cardId || 'G-677043',
          email: m.email || `${(m.name || 'vance.woolsey').toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: m.phone || '+62 812 3456 7890',
          organization: m.organization?.name || m.department?.name || 'PT. Masela',
          avatarUrl: m.faceImage ? (m.faceImage.startsWith('http') ? m.faceImage : `${BASE_URL}/${m.faceImage}`) : undefined,
        };
      }
    }

    if (appliedPersonFilter.personType === 'visitor' && appliedPersonFilter.selectedVisitorIds.length === 1) {
      const visId = appliedPersonFilter.selectedVisitorIds[0];
      const v: any = visitorList.find((item: any) => item.id === visId || item.visitorId === visId);
      if (v) {
        return {
          id: v.id || visId,
          name: v.name || v.visitorName || 'Vance Woolsey',
          type: 'visitor' as const,
          identityId: v.identityId || v.nik || 'vwoolsey',
          cardNumber: v.cardNumber || v.cardId || 'G-677043',
          email: v.email || `${(v.name || 'vance.woolsey').toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: v.phone || '+62 812 3456 7890',
          organization: v.companyName || v.organization || 'PT. Masela',
          avatarUrl: v.faceImage ? (v.faceImage.startsWith('http') ? v.faceImage : `${BASE_URL}/${v.faceImage}`) : undefined,
        };
      }
    }

    const sessionList: any[] = Array.isArray(sessionData)
      ? sessionData
      : Array.isArray((sessionData as any)?.collection?.data)
      ? (sessionData as any).collection.data
      : Array.isArray((sessionData as any)?.data)
      ? (sessionData as any).data
      : [];

    if (sessionList.length > 0) {
      const s = sessionList[0];
      return {
        id: s.personId || s.visitorId || s.memberId || '1',
        name: s.personName || s.visitorName || s.memberName || 'Vance Woolsey',
        type: (s.personType?.toLowerCase() === 'visitor' ? 'visitor' : 'member') as 'visitor' | 'member',
        identityId: 'vwoolsey',
        cardNumber: s.cardName || s.cardId || 'G-677043',
        email: 'vance.woolsey@example.com',
        phone: '+62 812 3456 7890',
        organization: s.hostName || 'PT. Masela',
      };
    }

    return null;
  }, [isSinglePersonSelected, selectedPersonDetailRow, appliedPersonFilter, memberList, visitorList, sessionData]);

  // Construct payload & Trigger API Call
  const triggerApiFetch = (customFilterState?: any) => {
    const currentPersonType = customFilterState?.personType !== undefined ? customFilterState.personType : personType;
    const currentVisitors = customFilterState?.selectedVisitorIds !== undefined ? customFilterState.selectedVisitorIds : selectedVisitorIds;
    const currentMembers = customFilterState?.selectedMemberIds !== undefined ? customFilterState.selectedMemberIds : selectedMemberIds;
    const currentAreaFilter = customFilterState?.appliedAreaFilter || appliedAreaFilter;
    const currentTimeRange = customFilterState?.timeRange || timeRange;
    const currentFrom = customFilterState?.fromDate !== undefined ? customFilterState.fromDate : fromDate;
    const currentTo = customFilterState?.toDate !== undefined ? customFilterState.toDate : toDate;
    const currentIsActive = customFilterState?.isActive !== undefined ? customFilterState.isActive : isActive;

    const fromISO = currentFrom ? new Date(currentFrom).toISOString() : undefined;
    const toISO = currentTo ? new Date(currentTo).toISOString() : undefined;

    const payload: OldGetFilter = {
      timeRange: currentTimeRange,
      TimeRange: currentTimeRange,
      from: fromISO,
      to: toISO,
      buildingId: currentAreaFilter.BuildingId || [],
      floorId: currentAreaFilter.FloorId || [],
      floorplanId: currentAreaFilter.FloorplanId || [],
      areaId: currentAreaFilter.MaskedAreaId || [],
      visitorId: currentPersonType === 'visitor' ? currentVisitors : [],
      memberId: currentPersonType === 'member' ? currentMembers : [],
      IsActive: currentIsActive,
      personType: currentPersonType === 'all' ? null : currentPersonType,
      timezone: deviceTimezone,
    };

    fetchVisitorSession(payload);
  };

  useEffect(() => {
    triggerApiFetch();
    setLastUpdatedTime(dayjs().format('DD MMM YYYY HH:mm:ss'));
    // eslint-disable-next-deps
  }, []);

  const handleApplyFilter = () => {
    setSelectedPersonDetailRow(null);
    setAppliedPersonFilter({
      personType,
      selectedVisitorIds,
      selectedMemberIds,
    });
    setAppliedTimeFilter({
      timeRange,
      fromDate,
      toDate,
    });
    setLastUpdatedTime(dayjs().format('DD MMM YYYY HH:mm:ss'));
    triggerApiFetch();
  };

  const handleResetFilter = () => {
    setSelectedPersonDetailRow(null);
    const defaultAreaFilter = { BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] };

    setTimeRange('daily');
    setFromDate(null);
    setToDate(null);
    setAppliedAreaFilter(defaultAreaFilter);
    setPersonType('all');
    setSelectedVisitorIds([]);
    setSelectedMemberIds([]);
    setIsActive(false);
    setResetToken((prev) => prev + 1);
    setAppliedPersonFilter({
      personType: 'all',
      selectedVisitorIds: [],
      selectedMemberIds: [],
    });
    setAppliedTimeFilter({
      timeRange: 'daily',
      fromDate: null,
      toDate: null,
    });
    setLastUpdatedTime(dayjs().format('DD MMM YYYY HH:mm:ss'));

    triggerApiFetch({
      timeRange: 'daily',
      fromDate: null,
      toDate: null,
      appliedAreaFilter: defaultAreaFilter,
      personType: 'all',
      selectedVisitorIds: [],
      selectedMemberIds: [],
      isActive: false,
    });
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportPdf = async () => {
    const reportElement = document.getElementById('tracking-report-export-content');
    if (!reportElement) return;

    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        height: reportElement.scrollHeight,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const margin = 10; // 10mm margin around pages
      const printableWidth = pdfWidth - margin * 2; // 190mm
      const printableHeight = pdfHeight - margin * 2; // 277mm

      const canvasPageHeight = Math.floor((canvas.width * printableHeight) / printableWidth);
      const totalPages = Math.ceil(canvas.height / canvasPageHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        const sourceY = i * canvasPageHeight;
        const currentSourceHeight = Math.min(canvasPageHeight, canvas.height - sourceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = currentSourceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            currentSourceHeight,
            0,
            0,
            canvas.width,
            currentSourceHeight,
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/png');
        const renderHeight = (currentSourceHeight * printableWidth) / canvas.width;

        pdf.addImage(pageImgData, 'PNG', margin, margin, printableWidth, renderHeight);
      }

      pdf.save(`Tracking_Report_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    } catch (error) {
      console.error('Failed to generate tracking report PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    triggerApiFetch();
  };

  return (
    <PageContainer title="Visitor Report" description="Real-time overview and analytics of people presence across your facilities">
      <Box sx={{ width: '100%', minHeight: '100vh', pb: 4 }}>
        {/* Header Bar */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={3} spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              Tracking Report
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Real-time overview and analytics of people presence across your facilities
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.primary">
                Live
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                Data is updated every 30 seconds
              </Typography>
            </Paper>

            <Button
              variant="outlined"
              startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <IconDownload size={18} />}
              onClick={handleExportPdf}
              disabled={isExporting || isLoading}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              {isExporting ? 'Exporting...' : 'Export Report'}
            </Button>

            <IconButton size="small" onClick={handleRefresh}>
              <IconDotsVertical size={20} />
            </IconButton>
          </Stack>
        </Stack>

        {/* Global Filter Sidebar + Main Layout Grid */}
        <Grid container spacing={3}>
          {/* Left Sidebar Filter */}
          <Grid size={{ xs: 12, md: 3.2, lg: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  FILTERS (GLOBAL)
                </Typography>
                <Typography variant="caption" color="primary.main" fontWeight={600}>
                  {deviceTimezone}
                </Typography>
              </Stack>

              <Stack spacing={2}>
                {/* 1. Time Range Selector */}
                <Box>
                  <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      Time Range
                    </Typography>
                  </CustomFormLabel>
                  <FormControl fullWidth size="small">
                    <Select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="custom">Custom Range</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* 2. From & To Date Time Pickers */}
                <Box>
                  <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      From Date & Time
                    </Typography>
                  </CustomFormLabel>
                  <TextField
                    fullWidth
                    size="small"
                    type="datetime-local"
                    value={fromDate || ''}
                    onChange={(e) => setFromDate(e.target.value || null)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box>
                  <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      To Date & Time
                    </Typography>
                  </CustomFormLabel>
                  <TextField
                    fullWidth
                    size="small"
                    type="datetime-local"
                    value={toDate || ''}
                    onChange={(e) => setToDate(e.target.value || null)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                {/* 3. Building, Floor, Floorplan, Area Tree Selector */}
                <Box>
                  <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      Building / Floor / Area :
                    </Typography>
                  </CustomFormLabel>

                  <Suspense fallback={<Typography variant="caption">Loading location tree...</Typography>}>
                    <AutocompleteFilter
                      buildings={buildingList}
                      floors={floorList}
                      floorplans={floorplanList}
                      maskedAreas={maskedAreaList}
                      initial={appliedAreaFilter}
                      onChangeFilter={setAppliedAreaFilter}
                      resetToken={resetToken}
                    />
                  </Suspense>
                </Box>

                {/* 4. Person Type Selector */}
                <Box>
                  <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600}>
                      Person Type
                    </Typography>
                  </CustomFormLabel>
                  <FormControl fullWidth size="small">
                    <Select
                      value={personType}
                      onChange={(e) => {
                        const newType = e.target.value as 'all' | 'visitor' | 'member';
                        setPersonType(newType);
                        if (newType !== 'visitor') setSelectedVisitorIds([]);
                        if (newType !== 'member') setSelectedMemberIds([]);
                      }}
                      size="small"
                    >
                      <MenuItem value="all">All (Member & Visitor)</MenuItem>
                      <MenuItem value="visitor">Visitor</MenuItem>
                      <MenuItem value="member">Member</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* 5. Dynamic Visitor or Member Autocomplete */}
                {personType === 'visitor' && (
                  <Box>
                    <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>
                        Select Visitor
                      </Typography>
                    </CustomFormLabel>
                    <Autocomplete
                      size="small"
                      options={visitorOptions}
                      getOptionLabel={(option) => option?.name || ''}
                      isOptionEqualToValue={(option, value) => option?.id === value?.id}
                      value={visitorOptions.find((o) => selectedVisitorIds.includes(o.id)) || null}
                      onChange={(_, newValue) => {
                        setSelectedVisitorIds(newValue ? [newValue.id] : []);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Search & select visitor..." size="small" />
                      )}
                    />
                  </Box>
                )}

                {personType === 'member' && (
                  <Box>
                    <CustomFormLabel sx={{ mt: 0, mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>
                        Select Member
                      </Typography>
                    </CustomFormLabel>
                    <Autocomplete
                      size="small"
                      options={memberOptions}
                      getOptionLabel={(option) => option?.name || ''}
                      isOptionEqualToValue={(option, value) => option?.id === value?.id}
                      value={memberOptions.find((o) => selectedMemberIds.includes(o.id)) || null}
                      onChange={(_, newValue) => {
                        setSelectedMemberIds(newValue ? [newValue.id] : []);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Search & select member..." size="small" />
                      )}
                    />
                  </Box>
                )}

                {/* 6. Is Active Toggle */}
                {/* <Box pt={0.5}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="caption" fontWeight={600} color="text.primary">
                        Active Presence Only
                      </Typography>
                    }
                  />
                </Box> */}

                {/* 7. Action Buttons */}
                <Stack direction="row" spacing={1.5} pt={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleApplyFilter}
                    disabled={isLoading}
                    sx={{ borderRadius: '8px' }}
                  >
                    {isLoading ? 'Applying...' : 'Apply'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    onClick={handleResetFilter}
                    disabled={isLoading}
                    sx={{ borderRadius: '8px' }}
                  >
                    Reset
                  </Button>
                </Stack>

                <Divider sx={{ my: 0.5 }} />

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconButton size="small" onClick={handleRefresh} disabled={isLoading}>
                    <IconRefresh size={18} />
                  </IconButton>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Last Updated
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color="text.primary">
                      {lastUpdatedTime}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* Main Content Area */}
          <Grid size={{ xs: 12, md: 8.8, lg: 9 }} id="tracking-report-export-content">
            {isSinglePersonSelected ? (
              <TrackingReportSinglePerson
                data={sessionData}
                isLoading={isLoading}
                isExporting={isExporting}
                selectedPersonInfo={selectedPersonInfo}
                onBack={handleResetFilter}
              />
            ) : (
              <Stack spacing={3}>
                {/* Row 1: Top Cards */}
                <TrackingReportTopCard data={sessionData} isLoading={isLoading} />

                {/* Row 2: Charts (Peak Hour, By Area, By People) */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, lg: 5 }}>
                    <TrackingReportPeakHour
                      data={sessionData}
                      isLoading={isLoading}
                      timeRange={appliedTimeFilter.timeRange}
                      fromDate={appliedTimeFilter.fromDate}
                      toDate={appliedTimeFilter.toDate}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6, lg: 3.5 }}>
                    <TrackingReportByArea data={sessionData} isLoading={isLoading} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6, lg: 3.5 }}>
                    <TrackingReportByPeople data={sessionData} isLoading={isLoading} />
                  </Grid>
                </Grid>

                {/* Row 3: Detail Table */}
                <TrackingReportDetail
                  data={sessionData}
                  isLoading={isLoading}
                  isExporting={isExporting}
                  onViewPersonDetail={handleViewPersonDetail}
                />
              </Stack>
            )}
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default TrackingReport;