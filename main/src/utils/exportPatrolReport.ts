import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

export const PATROL_REPORT_COLUMNS = [
  { header: 'Patrol Assignment', key: 'assignmentName', width: 20 },
  { header: 'Route',             key: 'routeName',       width: 20 },
  { header: 'Checkpoints',       key: 'totalCheckpoints', width: 30 },
  { header: 'Security',          key: 'securityName',    width: 20 },
  { header: 'Session',           key: 'session',         width: 22 },
  { header: 'Session Status',    key: 'sessionStatus',   width: 22 },
  { header: 'Completed Checkpoint',  key: 'completedCheckpoints', width: 20 },
  { header: 'Completion Percentage', key: 'completionPercentage', width: 20 },
  { header: 'Total Duration',    key: 'totalDuration',   width: 15 },
  { header: 'Total Case',        key: 'totalCases',      width: 12 },
  { header: 'Cases',             key: 'cases',           width: 25 },
  { header: 'Case Type',         key: 'caseType',        width: 15 },
  { header: 'Threat Level',      key: 'threatLevel',     width: 15 },
  { header: 'Area',              key: 'area',            width: 20 },
  { header: 'Report Time',       key: 'reportTime',      width: 22 },
  { header: 'Case Status',       key: 'caseStatus',      width: 15 },
  { header: 'Attachment',        key: 'attachment',      width: 30 },
] as const;

// ─────────────────────────────────────────────────────────────
// Plain row type for preview + export
// ─────────────────────────────────────────────────────────────
export interface PatrolReportRow {
  _type: 'header' | 'data';
  assignmentName?: string | null;
  routeName?: string | null;
  totalCheckpoints?: string | null;
  securityName?: string | null;
  session?: string | null;            // ISO date string for data rows
  sessionStatus?: string | null;
  completedCheckpoints?: number | null;
  completionPercentage?: number | null;
  totalDuration?: string | null;
  totalCases?: number | null;
  cases?: string | null;
  caseType?: string | null;
  threatLevel?: string | null;
  area?: string | null;
  reportTime?: string | null;         // ISO date string
  caseStatus?: string | null;
  attachment?: string | null;
}

const getCdnUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('https://ble-cdn.tunnel.piranticerdasindonesia.com/')) return url;
  return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
};

// ─────────────────────────────────────────────────────────────
// Build flat rows from API data (shared by preview & download)
// ─────────────────────────────────────────────────────────────
export const buildPatrolReportRows = (data: any[]): PatrolReportRow[] => {
  const rows: PatrolReportRow[] = [];

  const sortedData = [...data].sort((a, b) => {
    if (a.assignmentId !== b.assignmentId)
      return (a.assignmentId || '').localeCompare(b.assignmentId || '');
    if (a.securityId !== b.securityId)
      return (a.securityId || '').localeCompare(b.securityId || '');
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return aTime - bTime;
  });

  let currentAssignmentId: string | null = null;
  let currentSecurityId: string | null = null;

  sortedData.forEach((session) => {
    // ── Assignment header row ─────────────────────────────────
    if (session.assignmentId !== currentAssignmentId) {
      currentAssignmentId = session.assignmentId;
      currentSecurityId = null;

      const checkpointsList =
        session.timeline
          ?.filter((t: any) => t.stage?.startsWith('checkpoint_'))
          ?.map((t: any) => t.stageName?.replace('Checkpoint: ', '') || t.stageName)
          ?.filter((v: any, i: any, s: any) => s.indexOf(v) === i)
          ?.join(', ') || '-';

      rows.push({
        _type: 'header',
        assignmentName: session.assignmentName || '-',
        routeName:      session.routeName || '-',
        totalCheckpoints: checkpointsList,
      });
    }

    // ── Security de-duplication ───────────────────────────────
    const printSecurity = session.securityId !== currentSecurityId;
    if (printSecurity) currentSecurityId = session.securityId;

    const sessionBase: Partial<PatrolReportRow> = {
      _type: 'data',
      securityName:        printSecurity ? (session.securityName || '-') : null,
      session:             session.startedAt ?? null,
      sessionStatus:       session.sessionStatus || '-',
      completedCheckpoints: session.metrics?.completedCheckpoints ?? 0,
      completionPercentage: session.metrics?.completionPercentage ?? 0,
      totalDuration:       session.metrics?.totalDuration || '-',
      totalCases:          session.metrics?.totalCases ?? 0,
    };

    // ── Cases ─────────────────────────────────────────────────
    if (session.cases && session.cases.length > 0) {
      session.cases.forEach((c: any, index: number) => {
        const attachmentUrls = Array.isArray(c.attachments)
          ? c.attachments.map((a: any) => getCdnUrl(a?.fileUrl || a)).join(', ')
          : '';

        const caseFields: Partial<PatrolReportRow> = {
          cases:       c.title || '-',
          caseType:    c.caseType || '-',
          threatLevel: c.threatLevel || '-',
          area:        c.patrolAreaName || '-',
          reportTime:  c.reportedAt ?? null,
          caseStatus:  c.caseStatus || '-',
          attachment:  attachmentUrls || '-',
        };

        if (index === 0) {
          rows.push({ ...sessionBase, ...caseFields } as PatrolReportRow);
        } else {
          rows.push({ _type: 'data', ...caseFields });
        }
      });
    } else {
      rows.push({ ...sessionBase } as PatrolReportRow);
    }
  });

  return rows;
};

// ─────────────────────────────────────────────────────────────
// Excel download
// ─────────────────────────────────────────────────────────────
export const downloadPatrolReportExcel = async (
  rows: PatrolReportRow[],
  filename = 'PatrolReport.xlsx',
  customColumns?: readonly any[],
) => {
  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Patrol Report');

  worksheet.columns = (customColumns || PATROL_REPORT_COLUMNS).map((c) => ({ ...c }));
  worksheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    const xlRow = worksheet.addRow({
      assignmentName:      row.assignmentName ?? undefined,
      routeName:           row.routeName ?? undefined,
      totalCheckpoints:    row.totalCheckpoints ?? undefined,
      securityName:        row.securityName ?? undefined,
      session:             row.session ? dayjs(row.session).toDate() : undefined,
      sessionStatus:       row.sessionStatus ?? undefined,
      completedCheckpoints: row.completedCheckpoints ?? undefined,
      completionPercentage: row.completionPercentage ?? undefined,
      totalDuration:       row.totalDuration ?? undefined,
      totalCases:          row.totalCases ?? undefined,
      cases:               row.cases ?? undefined,
      caseType:            row.caseType ?? undefined,
      threatLevel:         row.threatLevel ?? undefined,
      area:                row.area ?? undefined,
      reportTime:          row.reportTime ? dayjs(row.reportTime).toDate() : undefined,
      caseStatus:          row.caseStatus ?? undefined,
      attachment:          row.attachment ?? undefined,
    });

    if (row._type === 'header') {
      xlRow.font = { bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
};
