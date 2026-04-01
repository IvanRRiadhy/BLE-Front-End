import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

/**
 * Generates an Excel (.xlsx) file for a given list of Patrol Reports (Sessions + Cases)
 * with the exact columns defined from the reference PatrolReport.xlsx.
 */
  const getCdnUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('https://ble-cdn.tunnel.piranticerdasindonesia.com/')) return url;
    return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
  };
export const downloadPatrolReportExcel = async (
  data: any[],
  filename = 'PatrolReport.xlsx'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Patrol Report');

  // Define columns matching the reference PatrolReport.xlsx
  worksheet.columns = [
    { header: 'Patrol Assignment', key: 'assignmentName', width: 20 },
    { header: 'Route', key: 'routeName', width: 20 },
    { header: 'Checkpoints', key: 'totalCheckpoints', width: 12 },
    { header: 'Security', key: 'securityName', width: 20 },
    { header: 'Session', key: 'session', width: 35 },
    { header: 'Completed Checkpoint', key: 'completedCheckpoints', width: 20 },
    { header: 'Completion Percentage', key: 'completionPercentage', width: 20 },
    { header: 'Total Duration', key: 'totalDuration', width: 15 },
    { header: 'Total Case', key: 'totalCases', width: 12 },
    { header: 'Cases', key: 'cases', width: 25 },
    { header: 'Case Type', key: 'caseType', width: 15 },
    { header: 'Threat Level', key: 'threatLevel', width: 15 },
    { header: 'Area', key: 'area', width: 20 },
    { header: 'Report Time', key: 'reportTime', width: 20 },
    { header: 'Case Status', key: 'caseStatus', width: 15 },
    { header: 'Attachment', key: 'attachment', width: 30 },
  ];

  // Apply bold font to the header row
  worksheet.getRow(1).font = { bold: true };

  // Sort data by assignmentId -> securityId -> startedAt to ensure proper grouping
  const sortedData = [...data].sort((a, b) => {
    if (a.assignmentId !== b.assignmentId) return (a.assignmentId || '').localeCompare(b.assignmentId || '');
    if (a.securityId !== b.securityId) return (a.securityId || '').localeCompare(b.securityId || '');
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return aTime - bTime;
  });

  let currentAssignmentId: string | null = null;
  let currentSecurityId: string | null = null;

  sortedData.forEach((session) => {
    // 1. Check if new assignment
    if (session.assignmentId !== currentAssignmentId) {
      currentAssignmentId = session.assignmentId;
      currentSecurityId = null; // reset security tracking for new assignment

      // Extract unique checkpoints from the first session's timeline
      const checkpointsList = session.timeline
        ?.filter((t: any) => t.stage?.startsWith('checkpoint_'))
        ?.map((t: any) => t.stageName?.replace('Checkpoint: ', '') || t.stageName)
        ?.filter((v: any, i: any, s: any) => s.indexOf(v) === i)
        ?.join(', ') || '-';

      worksheet.addRow({
        assignmentName: session.assignmentName || '-',
        routeName: session.routeName || '-',
        totalCheckpoints: checkpointsList,
      });
    }

    // 2. Check if new security within this assignment
    const printSecurity = session.securityId !== currentSecurityId;
    if (printSecurity) {
      currentSecurityId = session.securityId;
    }

    const sessionRowBase = {
      securityName: printSecurity ? (session.securityName || '-') : null,
      session: session.startedAt ? dayjs(session.startedAt).toDate() : '-',
      completedCheckpoints: session.metrics?.completedCheckpoints ?? 0,
      completionPercentage: session.metrics?.completionPercentage ?? 0,
      totalDuration: session.metrics?.totalDuration || '-',
      totalCases: session.metrics?.totalCases ?? 0,
    };

    // 3. Handle cases
    if (session.cases && session.cases.length > 0) {
      session.cases.forEach((c: any, index: number) => {
        const attachmentUrls = Array.isArray(c.attachments)
          ? c.attachments.map((a: any) => a?.fileUrl || a).join(', ')
          : '';

        if (index === 0) {
          // First case goes on the same row as session details
          worksheet.addRow({
            ...sessionRowBase,
            cases: c.title || '-',
            caseType: c.caseType || '-',
            threatLevel: c.threatLevel || '-',
            area: c.patrolAreaName || '-',
            reportTime: c.reportedAt ? dayjs(c.reportedAt).toDate() : '-',
            caseStatus: c.caseStatus || '-',
            attachment: getCdnUrl(attachmentUrls) || '-',
          });
        } else {
          // Additional cases get their own row with session/security columns empty
          worksheet.addRow({
            cases: c.title || '-',
            caseType: c.caseType || '-',
            threatLevel: c.threatLevel || '-',
            area: c.patrolAreaName || '-',
            reportTime: c.reportedAt ? dayjs(c.reportedAt).toDate() : '-',
            caseStatus: c.caseStatus || '-',
            attachment: getCdnUrl(attachmentUrls) || '-',
          });
        }
      });
    } else {
      // No cases, emit a single session row
      worksheet.addRow({
        ...sessionRowBase,
        cases: null,
        caseType: null,
        threatLevel: null,
        area: null,
        reportTime: null,
        caseStatus: null,
        attachment: null,
      });
    }
  });

  // Calculate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  // Trigger user download
  saveAs(blob, filename);
};
