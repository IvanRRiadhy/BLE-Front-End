import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
} from '@mui/material';
import { IconDownload } from '@tabler/icons-react';
import PageContainer from 'src/components/container/PageContainer';
import NewInvestigateFilter, {
  InvestigateFilterState,
} from 'src/components/master/Reports/NewInvestigate/NewInvestigateFilter';
import NewInvestigateContent from 'src/components/master/Reports/NewInvestigate/NewInvestigateContent';
import { usePersonOverview } from 'src/hooks/useInvestigate';
import { useNewVisitorSession } from 'src/hooks/useVisitorSession';
import { VisitorSessionResponseType, GetFilter } from 'src/store/apps/crud/visitorSession';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const NewInvestigate: React.FC = () => {
  // Filter state
  const [filterState, setFilterState] = useState<InvestigateFilterState>({
    person: null,
    timeRange: 'daily',
    from: dayjs().startOf('day').toISOString(),
    to: dayjs().endOf('day').toISOString(),
  });

  const [isExporting, setIsExporting] = useState(false);

  // Movement Replay Data & Loading
  const visitorSessionMutation = useNewVisitorSession();
  const [visitorSessionData, setVisitorSessionData] = useState<VisitorSessionResponseType | null>(null);
  const [isVisitorSessionLoading, setIsVisitorSessionLoading] = useState(false);

  // Query Hook
  const { data, isLoading } = usePersonOverview(
    {
      personId: filterState.person?.id || null,
      from: filterState.from || null,
      to: filterState.to || null,
    },
    Boolean(filterState.person?.id)
  );

  const handleSearch = async (newFilter: InvestigateFilterState) => {
    setFilterState(newFilter);

    if (newFilter.person?.id) {
      try {
        setIsVisitorSessionLoading(true);
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
        const personType = (newFilter.person.type || 'Member').toLowerCase() as any;

        // Movement Replay is restricted to 1 day only:
        // If range covers today or extends past today (tomorrow, next week, etc.), use today.
        // Only if the range strictly ends before today or starts after today and does not contain today, pick the closest bound (or to).
        const now = dayjs();
        const startDay = newFilter.from ? dayjs(newFilter.from).startOf('day') : null;
        const endDay = newFilter.to ? dayjs(newFilter.to).endOf('day') : null;

        let targetDay = now;
        if (startDay && endDay) {
          if (now.isAfter(endDay)) {
            // Whole range is in the past, pick the last day of the range
            targetDay = dayjs(newFilter.to);
          } else if (now.isBefore(startDay)) {
            // Whole range is in the future, pick start of the range
            targetDay = dayjs(newFilter.from);
          } else {
            // Range includes today (or extends into the future across today), so use today
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

  const handleExportPdf = async () => {
    const exportElement = document.getElementById('investigate-full-pdf-export-content');
    if (!exportElement) return;

    setIsExporting(true);
    try {
      // Give charts, canvas floorplans, and SVGs time to be fully ready in visible layout
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const canvas = await html2canvas(exportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        height: exportElement.scrollHeight,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const margin = 10; // 10mm margins
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
            currentSourceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/png');
        const renderHeight = (currentSourceHeight * printableWidth) / canvas.width;

        pdf.addImage(pageImgData, 'PNG', margin, margin, printableWidth, renderHeight);

        // Add page footer
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i + 1} of ${totalPages}  |  Investigation Report - ${filterState.person?.name || 'Person'}`,
          margin,
          pdfHeight - 4
        );
      }

      const personName = filterState.person?.name || 'Person';
      pdf.save(`Investigate_Report_${personName.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageContainer title="Investigate - Reports" description="Detailed analysis of a person's movement, access, and security events">
      {/* Header Breadcrumb & Title */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Reports &gt; Investigate
          </Typography>
          <Typography variant="h4" fontWeight={700} color="text.primary" mt={0.5}>
            Investigate
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detailed analysis of a person's movement, access, and security events
          </Typography>
        </Box>

        {/* Export Report PDF Button */}
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <IconDownload size={18} />}
            disabled={isExporting}
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
        </Box>
      </Stack>

      {/* Filter Component */}
      <NewInvestigateFilter onSearch={handleSearch} isLoading={isLoading || isVisitorSessionLoading} />

      {/* Content View */}
      {(isLoading || isVisitorSessionLoading) && !data && !visitorSessionData ? (
        <Stack alignItems="center" justifyContent="center" py={8} spacing={2}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Retrieving investigation data...
          </Typography>
        </Stack>
      ) : (
        <NewInvestigateContent
          data={data}
          isLoading={isLoading}
          visitorSessionData={visitorSessionData}
          isVisitorSessionLoading={isVisitorSessionLoading}
          selectedPerson={filterState.person}
          fromDate={filterState.from}
          toDate={filterState.to}
          isExporting={isExporting}
        />
      )}
    </PageContainer>
  );
};

export default NewInvestigate;
