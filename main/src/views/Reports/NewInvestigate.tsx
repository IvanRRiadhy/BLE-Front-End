import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { IconDownload, IconRefresh, IconUser, IconMapPin, IconX } from '@tabler/icons-react';
import { useSearchParams } from 'react-router';
import PageContainer from 'src/components/container/PageContainer';
import NewInvestigateFilter, {
  InvestigateFilterState,
  PersonOption,
  TimeRangeKey,
} from 'src/components/master/Reports/NewInvestigate/NewInvestigateFilter';
import NewInvestigateContent from 'src/components/master/Reports/NewInvestigate/NewInvestigateContent';
import NewAreaInvestigateFilter, {
  AreaInvestigateFilterState,
  AreaOption,
} from 'src/components/master/Reports/NewInvestigate/NewAreaInvestigateFilter';
import NewAreaInvestigateContent from 'src/components/master/Reports/NewInvestigate/NewAreaInvestigateContent';
import {
  usePersonOverview,
  useAreaInvestigation,
  AreaInvestigationTimeRange,
  useGlobalInvestigation,
  useGlobalInvestigationMutation,
} from 'src/hooks/useInvestigate';
import { useNewVisitorSession } from 'src/hooks/useVisitorSession';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useLocationHierarchy } from 'src/hooks/useBuilding';
import { VisitorSessionResponseType, GetFilter } from 'src/store/apps/crud/visitorSession';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type InvestigateMode = 'people' | 'area';

const NewInvestigate: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lookups to resolve entities from IDs in URL params
  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();
  const { data: hierarchyTree = [] } = useLocationHierarchy();

  const personOptions = useMemo<PersonOption[]>(() => {
    const memberOpts: PersonOption[] = members.map((m: any) => ({
      id: m.id || m.personId || '',
      name: m.name || 'Unknown Member',
      identityId: m.identityId || m.id || '-',
      type: 'Member',
      avatarUrl: m.faceImageUrl || m.faceImage || undefined,
    }));

    const visitorOpts: PersonOption[] = visitors.map((v: any) => ({
      id: v.id || v.personId || '',
      name: v.name || 'Unknown Visitor',
      identityId: v.identityId || v.id || '-',
      type: 'Visitor',
      avatarUrl: v.faceImageUrl || v.faceImage || undefined,
    }));

    return [...memberOpts, ...visitorOpts];
  }, [members, visitors]);

  const allAreas = useMemo<AreaOption[]>(() => {
    const areas: AreaOption[] = [];
    for (const b of hierarchyTree) {
      for (const f of b.floors ?? []) {
        for (const fp of f.floorplans ?? []) {
          for (const a of fp.areas ?? []) {
            areas.push({
              id: a.id,
              name: a.name || 'Unnamed Area',
              buildingName: b.name || '',
              floorName: f.name || '',
              floorplanName: fp.name || '',
            });
          }
        }
      }
    }
    return areas;
  }, [hierarchyTree]);

  // Read initial values from URL params
  const paramMode = searchParams.get('mode') || searchParams.get('section');
  const initialMode: InvestigateMode = paramMode === 'area' ? 'area' : 'people';

  const [activeMode, setActiveMode] = useState<InvestigateMode>(initialMode);

  // --- PEOPLE INVESTIGATION STATE ---
  const initialPeopleTimeRange: TimeRangeKey = (searchParams.get('timeRange') as TimeRangeKey) || 'daily';
  const initialPeopleFrom = initialPeopleTimeRange === 'custom' ? searchParams.get('from') || null : null;
  const initialPeopleTo = initialPeopleTimeRange === 'custom' ? searchParams.get('to') || null : null;
  const paramPersonId = searchParams.get('personId') || searchParams.get('person');

  const [filterState, setFilterState] = useState<InvestigateFilterState>({
    person: null,
    timeRange: initialPeopleTimeRange,
    from: initialPeopleFrom,
    to: initialPeopleTo,
  });

  const [isExporting, setIsExporting] = useState(false);

  // Movement Replay Data & Loading
  const visitorSessionMutation = useNewVisitorSession();
  const [visitorSessionData, setVisitorSessionData] = useState<VisitorSessionResponseType | null>(null);
  const [isVisitorSessionLoading, setIsVisitorSessionLoading] = useState(false);

  // Query Hook for Person Overview
  const {
    data: personData,
    isLoading: isPersonLoading,
    refetch: refetchPerson,
    isRefetching: isPersonRefetching,
  } = usePersonOverview(
    {
      personId: filterState.person?.id || null,
      timeRange: filterState.timeRange,
      from: filterState.timeRange === 'custom' ? filterState.from || null : null,
      to: filterState.timeRange === 'custom' ? filterState.to || null : null,
    },
    Boolean(filterState.person?.id)
  );

  // --- AREA INVESTIGATION STATE ---
  const initialAreaTimeRange: AreaInvestigationTimeRange =
    (searchParams.get('timeRange') as AreaInvestigationTimeRange) || 'daily';
  const initialAreaFrom = searchParams.get('from') || null;
  const initialAreaTo = searchParams.get('to') || null;
  const paramAreaId = searchParams.get('areaId') || searchParams.get('area');

  const [areaFilterState, setAreaFilterState] = useState<AreaInvestigateFilterState>({
    area: null,
    timeRange: initialAreaTimeRange,
    from: initialAreaFrom,
    to: initialAreaTo,
  });

  const {
    data: areaData,
    isLoading: isAreaLoading,
    refetch: refetchArea,
    isRefetching: isAreaRefetching,
  } = useAreaInvestigation(
    {
      areaId: areaFilterState.area?.id || null,
      timeRange: areaFilterState.timeRange,
      from: areaFilterState.from,
      to: areaFilterState.to,
    },
    Boolean(areaFilterState.area?.id)
  );

  // --- GLOBAL INVESTIGATION (Default Overview when nothing investigated) ---
  const deviceTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
    []
  );

  const {
    data: globalInvestigationData,
    isLoading: isGlobalLoading,
    refetch: refetchGlobal,
    isRefetching: isGlobalRefetching,
  } = useGlobalInvestigation({
    timeRange: 'daily',
    from: null,
    to: null,
    areaId: null,
    timezone: deviceTimezone,
  });

  const globalMutation = useGlobalInvestigationMutation();

  // Auto-investigate flag so we only auto-trigger once per URL param match
  const autoInvestigatedPeopleRef = useRef(false);
  const autoInvestigatedAreaRef = useRef(false);

  // Resolve person from URL params and auto investigate
  useEffect(() => {
    if (paramPersonId && !autoInvestigatedPeopleRef.current && personOptions.length > 0) {
      const found = personOptions.find((p) => p.id === paramPersonId);
      if (found) {
        autoInvestigatedPeopleRef.current = true;
        const newFilter: InvestigateFilterState = {
          person: found,
          timeRange: initialPeopleTimeRange,
          from: initialPeopleFrom,
          to: initialPeopleTo,
        };
        handleSearchPeople(newFilter);
      }
    }
  }, [paramPersonId, personOptions, initialPeopleTimeRange, initialPeopleFrom, initialPeopleTo]);

  // Resolve area from URL params and auto investigate
  useEffect(() => {
    if (paramAreaId && !autoInvestigatedAreaRef.current && allAreas.length > 0) {
      const found = allAreas.find((a) => a.id === paramAreaId);
      if (found) {
        autoInvestigatedAreaRef.current = true;
        const newFilter: AreaInvestigateFilterState = {
          area: found,
          timeRange: initialAreaTimeRange,
          from: initialAreaFrom,
          to: initialAreaTo,
        };
        handleSearchArea(newFilter);
      }
    }
  }, [paramAreaId, allAreas, initialAreaTimeRange, initialAreaFrom, initialAreaTo]);

  // Sync state back to URL params
  const updateUrlParams = (
    mode: InvestigateMode,
    peopleFilter: InvestigateFilterState,
    areaFilter: AreaInvestigateFilterState
  ) => {
    const params = new URLSearchParams();
    params.set('mode', mode);

    if (mode === 'people') {
      if (peopleFilter.person?.id) {
        params.set('personId', peopleFilter.person.id);
      }
      if (peopleFilter.timeRange) {
        params.set('timeRange', peopleFilter.timeRange);
      }
      if (peopleFilter.timeRange === 'custom') {
        if (peopleFilter.from) params.set('from', peopleFilter.from);
        if (peopleFilter.to) params.set('to', peopleFilter.to);
      }
    } else {
      if (areaFilter.area?.id) {
        params.set('areaId', areaFilter.area.id);
      }
      if (areaFilter.timeRange) {
        params.set('timeRange', areaFilter.timeRange);
      }
      if (areaFilter.timeRange === 'custom') {
        if (areaFilter.from) params.set('from', areaFilter.from);
        if (areaFilter.to) params.set('to', areaFilter.to);
      }
    }

    setSearchParams(params, { replace: true });
  };

  // Busy & Generated checks per mode
  const isPeopleBusy = isPersonLoading || isVisitorSessionLoading || isPersonRefetching;
  const isAreaBusy = isAreaLoading || isAreaRefetching;
  const isGlobalBusy = isGlobalLoading || isGlobalRefetching || globalMutation.isPending;
  const isBusy =
    activeMode === 'people'
      ? (filterState.person?.id ? isPeopleBusy : isGlobalBusy)
      : (areaFilterState.area?.id ? isAreaBusy : isGlobalBusy);

  const isPeopleReportGenerated = Boolean(filterState.person?.id && (personData || visitorSessionData));
  const isAreaReportGenerated = Boolean(areaFilterState.area?.id && areaData);
  const isReportGenerated =
    activeMode === 'people'
      ? (filterState.person?.id ? isPeopleReportGenerated : Boolean(globalInvestigationData))
      : (areaFilterState.area?.id ? isAreaReportGenerated : Boolean(globalInvestigationData));

  const handleRefresh = async () => {
    if (activeMode === 'people') {
      if (!filterState.person?.id) {
        await refetchGlobal();
        toast.success('Refreshed global facility overview');
        return;
      }
      await Promise.all([refetchPerson(), handleSearchPeople(filterState)]);
    } else {
      if (!areaFilterState.area?.id) {
        await refetchGlobal();
        toast.success('Refreshed global facility overview');
        return;
      }
      await refetchArea();
    }
  };

  const handleSearchPeople = async (newFilter: InvestigateFilterState) => {
    setFilterState(newFilter);
    updateUrlParams('people', newFilter, areaFilterState);

    if (newFilter.person?.id) {
      try {
        setIsVisitorSessionLoading(true);
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
        const personType = (newFilter.person.type || 'Member').toLowerCase() as any;

        const now = dayjs();
        const startDay = newFilter.from ? dayjs(newFilter.from).startOf('day') : null;
        const endDay = newFilter.to ? dayjs(newFilter.to).endOf('day') : null;

        let targetDay = now;
        if (startDay && endDay) {
          if (now.isAfter(endDay)) {
            targetDay = dayjs(newFilter.to);
          } else if (now.isBefore(startDay)) {
            targetDay = dayjs(newFilter.from);
          } else {
            targetDay = now;
          }
        } else if (endDay && now.isAfter(endDay)) {
          targetDay = dayjs(newFilter.to);
        } else {
          targetDay = now;
        }

        const movementFromIso = targetDay.startOf('day').toISOString();
        const movementToIso = targetDay.endOf('day').toISOString();

        const payload: GetFilter & { personId?: string } = {
          timeRange: 'custom',
          from: movementFromIso,
          to: movementToIso,
          personType,
          identityId: newFilter.person.identityId || null,
          timezone: deviceTimezone,
        };

        const res = await visitorSessionMutation.mutateAsync({
          filter: payload,
          options: {
            includeSummary: true,
            includeVisualPaths: true,
            includeIncident: true,
          },
        });

        setVisitorSessionData(res);
      } catch (error) {
        console.error('Failed to fetch visitor session for movement replay:', error);
        toast.error('Failed to fetch movement replay data');
      } finally {
        setIsVisitorSessionLoading(false);
      }
    } else {
      setVisitorSessionData(null);
    }
  };

  const handleSearchArea = (newFilter: AreaInvestigateFilterState) => {
    setAreaFilterState(newFilter);
    updateUrlParams('area', filterState, newFilter);
  };

  const handleResetPeople = () => {
    const clearedFilter: InvestigateFilterState = {
      person: null,
      timeRange: 'daily',
      from: null,
      to: null,
    };
    setFilterState(clearedFilter);
    setVisitorSessionData(null);
    updateUrlParams('people', clearedFilter, areaFilterState);
  };

  const handleResetArea = () => {
    const clearedFilter: AreaInvestigateFilterState = {
      area: null,
      timeRange: 'daily',
      from: null,
      to: null,
    };
    setAreaFilterState(clearedFilter);
    updateUrlParams('area', filterState, clearedFilter);
  };

  const handleExportPdf = async () => {
    const exportId =
      activeMode === 'people'
        ? 'investigate-full-pdf-export-content'
        : 'area-investigate-export-content';

    const exportElement = document.getElementById(exportId);
    if (!exportElement) return;

    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const canvas = await html2canvas(exportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        height: exportElement.scrollHeight,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const margin = 10;
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pdfHeight - margin * 2;

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
            currentSourceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/png');
        const renderHeight = (currentSourceHeight * printableWidth) / canvas.width;

        pdf.addImage(pageImgData, 'PNG', margin, margin, printableWidth, renderHeight);

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        let reportTitle = 'Facility Global Overview';
        if (activeMode === 'people' && filterState.person?.name) {
          reportTitle = `Person: ${filterState.person.name}`;
        } else if (activeMode === 'area' && areaFilterState.area?.name) {
          reportTitle = `Area: ${areaFilterState.area.name}`;
        }

        pdf.text(
          `Page ${i + 1} of ${totalPages}  |  Investigation Report - ${reportTitle}`,
          margin,
          pdfHeight - 4
        );
      }

      let filePrefix = 'Global_Facility_Investigation';
      let entityName = 'Overview';

      if (activeMode === 'people' && filterState.person?.id) {
        filePrefix = 'Person_Investigate';
        entityName = (filterState.person.name || 'Person').replace(/\s+/g, '_');
      } else if (activeMode === 'area' && areaFilterState.area?.id) {
        filePrefix = 'Area_Investigate';
        entityName = (areaFilterState.area.name || 'Area').replace(/\s+/g, '_');
      }

      pdf.save(`${filePrefix}_${entityName}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageContainer
      title="Investigate - Reports"
      description="Detailed analysis of a person's or area's movement, occupancy, access, and security events"
    >
      {/* Header Breadcrumb & Title */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={3}
        spacing={2}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Reports &gt; Investigate
          </Typography>
          <Typography variant="h4" fontWeight={700} color="text.primary" mt={0.5}>
            Investigate
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeMode === 'people'
              ? "Detailed analysis of a person's movement, access, and security events"
              : 'Real-time occupancy, floorplan positioning, access compliance, and incident history for areas'}
          </Typography>
        </Box>

        {/* Actions: Reset, Refresh & Export PDF Buttons */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          {Boolean(
            (activeMode === 'people' && filterState.person?.id) ||
            (activeMode === 'area' && areaFilterState.area?.id)
          ) && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<IconX size={16} />}
              onClick={() => {
                if (activeMode === 'people') {
                  handleResetPeople();
                } else {
                  handleResetArea();
                }
              }}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.secondary',
                bgcolor: 'background.paper',
                height: 38,
                px: 1.5,
                '&:hover': {
                  borderColor: 'error.main',
                  color: 'error.main',
                  bgcolor: '#FEF2F2',
                },
              }}
            >
              Reset Target
            </Button>
          )}

          <Tooltip
            title={
              (activeMode === 'people' && filterState.person?.id) ||
              (activeMode === 'area' && areaFilterState.area?.id)
                ? 'Refresh investigation data'
                : 'Refresh facility overview'
            }
          >
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={isBusy}
                color="primary"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  bgcolor: 'background.paper',
                  p: '9px',
                }}
              >
                {isBusy ? <CircularProgress size={18} color="inherit" /> : <IconRefresh size={18} />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={!isReportGenerated ? 'Generate an investigation report first to export' : ''}>
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <IconDownload size={18} />}
                disabled={isExporting || isBusy || !isReportGenerated}
                onClick={handleExportPdf}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: '#1877F2',
                  '&:hover': { bgcolor: '#1164D9' },
                }}
              >
                {isExporting ? 'Exporting PDF...' : 'Export PDF'}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Mode Switcher Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeMode}
          onChange={(_, newMode) => {
            const mode = newMode as InvestigateMode;
            setActiveMode(mode);
            updateUrlParams(mode, filterState, areaFilterState);
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '15px',
              minHeight: 44,
              px: 3,
            },
          }}
        >
          <Tab
            value="people"
            label="People Investigation"
            icon={<IconUser size={18} />}
            iconPosition="start"
          />
          <Tab
            value="area"
            label="Area Investigation"
            icon={<IconMapPin size={18} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* SECTION 1: PEOPLE INVESTIGATION */}
      {activeMode === 'people' && (
        <>
          <NewInvestigateFilter
            onSearch={handleSearchPeople}
            onReset={handleResetPeople}
            isLoading={isPeopleBusy}
            initialValue={filterState}
          />

          {isPeopleBusy && !personData && !visitorSessionData ? (
            <Stack alignItems="center" justifyContent="center" py={8} spacing={2}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Retrieving investigation data...
              </Typography>
            </Stack>
          ) : (
            <NewInvestigateContent
              data={personData}
              isLoading={isPersonLoading}
              visitorSessionData={visitorSessionData}
              isVisitorSessionLoading={isVisitorSessionLoading}
              selectedPerson={filterState.person}
              fromDate={filterState.from}
              toDate={filterState.to}
              isExporting={isExporting}
              globalData={globalInvestigationData}
              isGlobalLoading={isGlobalLoading}
              onSelectPerson={(personId) => {
                const found = personOptions.find((p) => p.id === personId);
                if (found) {
                  const newFilter: InvestigateFilterState = {
                    ...filterState,
                    person: found,
                  };
                  handleSearchPeople(newFilter);
                }
              }}
            />
          )}
        </>
      )}

      {/* SECTION 2: AREA INVESTIGATION */}
      {activeMode === 'area' && (
        <>
          <NewAreaInvestigateFilter
            onSearch={handleSearchArea}
            onReset={handleResetArea}
            isLoading={isAreaBusy}
            initialValue={areaFilterState}
          />

          {isAreaBusy && !areaData ? (
            <Stack alignItems="center" justifyContent="center" py={8} spacing={2}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Retrieving area investigation data...
              </Typography>
            </Stack>
          ) : (
            <NewAreaInvestigateContent
              data={areaData}
              isLoading={isAreaLoading}
              selectedArea={areaFilterState.area}
              isExporting={isExporting}
              timeRange={areaFilterState.timeRange}
              fromDate={areaFilterState.from}
              toDate={areaFilterState.to}
              globalData={globalInvestigationData}
              isGlobalLoading={isGlobalLoading}
              onSelectArea={(areaId) => {
                const found = allAreas.find((a) => a.id === areaId);
                if (found) {
                  const newFilter: AreaInvestigateFilterState = {
                    ...areaFilterState,
                    area: found,
                  };
                  handleSearchArea(newFilter);
                }
              }}
              onSelectPerson={(personId) => {
                const found = personOptions.find((p) => p.id === personId);
                if (found) {
                  setActiveMode('people');
                  const newFilter: InvestigateFilterState = {
                    ...filterState,
                    person: found,
                  };
                  handleSearchPeople(newFilter);
                }
              }}
            />
          )}
        </>
      )}
    </PageContainer>
  );
};

export default NewInvestigate;
