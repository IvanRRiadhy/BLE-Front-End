import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  downloadPatrolReportExcel,
  PatrolReportRow,
  PATROL_REPORT_COLUMNS,
} from 'src/utils/exportPatrolReport';

const SESSION_KEY = 'patrolReportPreviewData';

const fmtDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return '';
  return withTime
    ? dayjs(iso).format('YYYY-MM-DD HH:mm:ss')
    : dayjs(iso).format('YYYY-MM-DD HH:mm');
};

const cellValue = (row: PatrolReportRow, key: string): string => {
  const v = (row as any)[key];
  if (v === null || v === undefined) return '';
  if (key === 'session') return fmtDate(v);
  if (key === 'reportTime') return fmtDate(v, true);
  if (key === 'completionPercentage') return `${v}%`;
  return String(v);
};

const COLS = PATROL_REPORT_COLUMNS;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  toolbar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 24px',
    backgroundColor: '#1e293b',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  tableWrapper: {
    overflowX: 'auto',
    padding: '24px',
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    minWidth: 1400,
    backgroundColor: '#fff',
    fontSize: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  th: {
    backgroundColor: '#1e293b',
    color: '#fff',
    fontWeight: 700,
    padding: '8px 10px',
    border: '1px solid #334155',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  tdHeader: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontWeight: 700,
    padding: '7px 10px',
    border: '1px solid #bfdbfe',
  },
  tdData: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    verticalAlign: 'top',
    color: '#1e293b',
  },
  tdDataAlt: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    verticalAlign: 'top',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
};

// ─── PDF Download ─────────────────────────────────────────────────────────────
const downloadAsPdf = (rows: PatrolReportRow[], filename: string) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });

  const head = [COLS.map((c) => c.header)];
  const body: string[][] = rows.map((row) => COLS.map((c) => cellValue(row, c.key)));

  autoTable(doc, {
    head,
    body,
    startY: 30,
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    didParseCell: (data) => {
      const row = rows[data.row.index];
      if (row?._type === 'header') {
        data.cell.styles.fillColor = [219, 234, 254];
        data.cell.styles.textColor = [30, 64, 175];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    columnStyles: { 15: { cellWidth: 60 } },
  });

  doc.save(filename.replace('.xlsx', '.pdf'));
};

// ─── Component ────────────────────────────────────────────────────────────────
const PatrolReportPreview: React.FC = () => {
  const [rows, setRows] = useState<PatrolReportRow[]>([]);
  const [filename, setFilename] = useState('PatrolReport.xlsx');
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setRows(parsed.rows ?? []);
        setFilename(parsed.filename ?? 'PatrolReport.xlsx');
        setHasData(true);
      }
    } catch {
      // ignore parse errors
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!hasData || rows.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        gap={2}
      >
        <Typography variant="h5" color="text.secondary">
          No preview data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please return to the Patrol Report and click "Generate Report".
        </Typography>
        <Button variant="outlined" onClick={() => window.close()}>
          Close Tab
        </Button>
      </Box>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Toolbar ── */}
      <div style={styles.toolbar} id="preview-toolbar">
        <span style={styles.title}>Patrol Report Preview — {filename.replace('.xlsx', '')}</span>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Print">
            <Button
              id="btn-print"
              variant="contained"
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              sx={{ bgcolor: '#475569', '&:hover': { bgcolor: '#334155' } }}
            >
              Print
            </Button>
          </Tooltip>
          <Tooltip title="Download as PDF">
            <Button
              id="btn-pdf"
              variant="contained"
              size="small"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => downloadAsPdf(rows, filename)}
            >
              PDF
            </Button>
          </Tooltip>
          <Tooltip title="Download as Excel">
            <Button
              id="btn-excel"
              variant="contained"
              size="small"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={() => downloadPatrolReportExcel(rows, filename)}
            >
              Excel
            </Button>
          </Tooltip>
        </Stack>
      </div>

      {/* ── Table ── */}
      <div style={styles.tableWrapper}>
        <table style={styles.table} id="patrol-report-table">
          <thead>
            <tr>
              {COLS.map((col) => (
                <th key={col.key} style={styles.th}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const isHeader = row._type === 'header';
              const baseStyle = rowIdx % 2 === 0 ? styles.tdData : styles.tdDataAlt;

              return (
                <tr key={rowIdx}>
                  {COLS.map((col) => {
                    const val = cellValue(row, col.key);
                    return (
                      <td
                        key={col.key}
                        style={isHeader ? styles.tdHeader : baseStyle}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Print-only style: hide toolbar */}
      <style>{`
        @media print {
          #preview-toolbar { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
};

export default PatrolReportPreview;
