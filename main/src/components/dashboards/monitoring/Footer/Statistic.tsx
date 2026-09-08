import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  useTheme,
  Avatar,
} from '@mui/material';
import {
  Domain as BuildingIcon,
  Layers as FloorIcon,
  Map as FloorplanIcon,
  CenterFocusWeak as AreaIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  getAllBuildings,
  getAllFloors,
  getAllFloorplans,
  getAllAreas,
  fetchCountingData,
} from 'src/store/apps/tracking/Beacon';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';

// Define the counting data structure based on the MQTT message
interface CountingPersons {
  visitor: string[];
  member: string[];
  security: string[];
}

interface CountingEntity {
  count: number;
  name: string;
  persons: CountingPersons;
}

interface CountingData {
  building?: Record<string, CountingEntity>;
  floor?: Record<string, CountingEntity>;
  floorplan?: Record<string, CountingEntity>;
  area?: Record<string, CountingEntity>;
  time: string;
}

interface StatisticTableProps {
  title: string;
  subtitle: string;
  unitSingular: string;
  unitPlural: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  data: Array<{ id: string; name: string; count: number }>;
  onRowClick?: (id: string) => void;
}

// Top-level memoized component so TableContainer DOM node & scroll state persist on Redux data refreshes
const StatisticTable = React.memo(({
  title,
  subtitle,
  unitSingular,
  unitPlural,
  icon,
  iconBgColor,
  iconColor,
  data,
  onRowClick,
}: StatisticTableProps) => {
  const theme = useTheme();

  // Calculate total people count for this category to derive percentage
  const totalCategoryPeople = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.count || 0), 0);
  }, [data]);

  const countLabel = `${data.length} ${data.length === 1 ? unitSingular : unitPlural}`;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <CardContent sx={{ p: 1.5, pb: '12px !important', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: iconBgColor,
                color: iconColor,
                width: 32,
                height: 32,
                borderRadius: 2,
                '& svg': { fontSize: '1.1rem' },
              }}
            >
              {icon}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2, fontSize: '0.875rem' }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block', lineHeight: 1 }}>
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={countLabel}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              color: 'text.primary',
              borderRadius: 1.5,
              px: 0.25,
            }}
          />
        </Box>

        {/* Table Section */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            flex: 1,
            maxHeight: '200px',
            overflow: 'auto',
            borderRadius: 1.5,
            bgcolor: 'transparent',
            '& .MuiTableCell-root': {
              borderBottom: `1px solid ${theme.palette.divider}`,
              padding: '6px 8px',
              fontSize: '0.8rem',
            },
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width="32px" sx={{ fontWeight: 600, color: 'text.secondary', py: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#f8fafc' }}>
                  #
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#f8fafc' }}>
                  {title.slice(0, -1)} Name
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#f8fafc' }}>
                  People
                </TableCell>
                <TableCell width="38%" sx={{ fontWeight: 600, color: 'text.secondary', py: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#f8fafc' }}>
                  Occupancy
                </TableCell>
                <TableCell width="24px" sx={{ py: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#f8fafc' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length > 0 ? (
                data.map((item, index) => {
                  const pct = totalCategoryPeople > 0 ? Math.round(((item.count || 0) / totalCategoryPeople) * 100) : 0;
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      onClick={() => {
                        if (onRowClick) {
                          onRowClick(item.id);
                        } else {
                          console.log(`${title} ID: ${item.id}`);
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {item.name || 'Unnamed'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        {item.count || 0}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: '#2563eb',
                              },
                            }}
                          />
                          <Typography variant="body2" sx={{ minWidth: 30, fontWeight: 600, fontSize: '0.73rem', color: 'text.secondary', textAlign: 'right' }}>
                            {pct}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell padding="none" align="center">
                        <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
});

const Statistic = () => {
  // Get real data from Redux store using the helper functions
  const buildingData = useSelector((state: RootState) => getAllBuildings(state));
  const floorData = useSelector((state: RootState) => getAllFloors(state));
  const floorplanData = useSelector((state: RootState) => getAllFloorplans(state));
  const areaData = useSelector((state: RootState) => getAllAreas(state));
  const memberData = useAllMembers().data || [];
  const visitorData = useAllVisitor().data || [];
  const securityData = useAllSecuritys().data || [];
  // console.log(memberData, visitorData)
  
  const countingData = useSelector((state: RootState) => state.BeaconReducer.countingData) as CountingData;
  const dispatch = useDispatch();



  // Create a lookup map for members by ID
  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    memberData.forEach(member => {
      map[member.id.toUpperCase()] = member;
    });
    return map;
    // console.log("memberMap", map)
  }, [memberData]);

  // Create a lookup map for visitors by ID
  const visitorMap = useMemo(() => {
    const map: Record<string, any> = {};
    visitorData.forEach(visitor => {
      map[visitor.id.toUpperCase()] = visitor;
    });
    // console.log("visitorMap", map)
    return map;
  }, [visitorData]);

  // Create a lookup map for security by ID
  const securityMap = useMemo(() => {
    const map: Record<string, any> = {};
    securityData.forEach(security => {
      map[security.id.toUpperCase()] = security;
    });
    return map;
  }, [securityData]);

  // Function to generate HTML for the new window
  const generatePersonWindowHTML = (title: string, personsData: any[], type: 'building' | 'floor' | 'floorplan' | 'area', isDarkMode: boolean) => {
    // Separate visitors and members
    const visitors = personsData.filter(person => person.type === 'visitor');
    const members = personsData.filter(person => person.type === 'member');
    const security = personsData.filter(person => person.type === 'security');
    
    const totalPersons = personsData.length;
    const uniqueVisitors = new Set(visitors.map(v => v.id)).size;
    const uniqueMembers = new Set(members.map(m => m.id)).size;
    const uniqueSecurity = new Set(security.map(s => s.id)).size;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Person Data</title>
          <meta charset="UTF-8">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: ${isDarkMode ? '#1a1f26' : '#f5f5f5'};
              color: ${isDarkMode ? '#eef2f6' : '#333'};
            }
            .container {
              max-width: 1400px;
              margin: 0 auto;
              background: ${isDarkMode ? '#242b34' : 'white'};
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,${isDarkMode ? '0.4' : '0.1'});
              padding: 24px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid ${isDarkMode ? '#333' : '#e0e0e0'};
            }
            h1 {
              margin: 0;
              color: #1976d2;
              font-size: 24px;
            }
            h2 {
              margin: 24px 0 16px 0;
              color: ${isDarkMode ? '#eef2f6' : '#333'};
              font-size: 20px;
            }
            .timestamp {
              color: ${isDarkMode ? '#aaa' : '#666'};
              font-size: 14px;
            }
            .stats-container {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
              margin-bottom: 24px;
            }
            .stat-card {
              background: ${isDarkMode ? '#2c343f' : '#f8f9fa'};
              border-radius: 6px;
              padding: 16px;
              border-left: 4px solid #1976d2;
            }
            .stat-value {
              font-size: 28px;
              font-weight: bold;
              color: #1976d2;
              margin-bottom: 4px;
            }
            .stat-label {
              font-size: 14px;
              color: ${isDarkMode ? '#aaa' : '#666'};
            }
            .table-container {
              overflow-x: auto;
              margin-bottom: 24px;
              border-radius: 6px;
              border: 1px solid ${isDarkMode ? '#333' : '#e0e0e0'};
            }
            table {
              width: 100%;
              border-collapse: collapse;
              min-width: 1200px;
            }
            th {
              background-color: ${isDarkMode ? '#333e4d' : '#f8f9fa'};
              padding: 12px 16px;
              text-align: left;
              font-weight: 600;
              color: ${isDarkMode ? '#eef2f6' : '#333'};
              border-bottom: 2px solid ${isDarkMode ? '#444' : '#e0e0e0'};
              position: sticky;
              top: 0;
              z-index: 10;
            }
            td {
              padding: 10px 16px;
              border-bottom: 1px solid ${isDarkMode ? '#333' : '#e0e0e0'};
              vertical-align: top;
            }
            tr:hover {
              background-color: ${isDarkMode ? '#3d4857' : '#f5f5f5'};
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
            }
            .badge-visitor {
              background-color: ${isDarkMode ? 'rgba(25, 118, 210, 0.2)' : '#e3f2fd'};
              color: ${isDarkMode ? '#64b5f6' : '#1976d2'};
            }
            .badge-member {
              background-color: ${isDarkMode ? 'rgba(46, 125, 50, 0.2)' : '#e8f5e9'};
              color: ${isDarkMode ? '#81c784' : '#2e7d32'};
            }
            .no-data {
              text-align: center;
              padding: 40px;
              color: #999;
              font-style: italic;
            }
            .export-buttons {
              display: flex;
              gap: 12px;
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid ${isDarkMode ? '#333' : '#e0e0e0'};
            }
            .export-btn {
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: all 0.2s;
              border: none;
            }
            .btn-excel {
              background-color: #2e7d32;
              color: white;
            }
            .btn-excel:hover {
              background-color: #1b5e20;
            }
            .btn-pdf {
              background-color: #d32f2f;
              color: white;
            }
            .btn-pdf:hover {
              background-color: #b71c1c;
            }
            .person-type {
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
              <div class="timestamp">
                Generated: ${new Date().toLocaleString()}
              </div>
            </div>
            
            <div class="stats-container">
              <div class="stat-card">
                <div class="stat-value">${totalPersons}</div>
                <div class="stat-label">Total Persons</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${visitors.length}</div>
                <div class="stat-label">Visitors</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${members.length}</div>
                <div class="stat-label">Members</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${uniqueVisitors}</div>
                <div class="stat-label">Unique Visitors</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${uniqueMembers}</div>
                <div class="stat-label">Unique Members</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${uniqueSecurity}</div>
                <div class="stat-label">Unique Securities</div>
              </div>
            </div>
            
            ${visitors.length > 0 ? `
              <h2>Visitors (${visitors.length})</h2>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Card Number</th>
                      <th>BLE Card Number</th>
                      <th>Organization</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>VIP</th>
                      <th>Blacklist</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${visitors.map((person, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td><strong>${person.name || 'N/A'}</strong></td>
                        <td>
                          <span class="badge badge-visitor">Visitor</span><br>
                          <small>${person.visitorType || 'N/A'}</small>
                        </td>
                        <td>${person.cardNumber || 'N/A'}</td>
                        <td>${person.bleCardNumber || 'N/A'}</td>
                        <td>${person.organizationName || 'N/A'}</td>
                        <td>${person.phone || 'N/A'}</td>
                        <td>${person.email || 'N/A'}</td>
                        <td>${person.isVip ? 'Yes' : 'No'}</td>
                        <td>${person.isBlacklist ? 'Yes' : 'No'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            ${members.length > 0 ? `
              <h2>Members (${members.length})</h2>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Card Number</th>
                      <th>BLE Card Number</th>
                      <th>Organization</th>
                      <th>Department</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Blacklist</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${members.map((person, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td><strong>${person.name || 'N/A'}</strong></td>
                        <td>
                          <span class="badge badge-member">Member</span><br>
                          <small>${person.statusEmployee || 'N/A'}</small>
                        </td>
                        <td>${person.cardNumber || 'N/A'}</td>
                        <td>${person.bleCardNumber || 'N/A'}</td>
                        <td>${person.organization?.name || person.organizationName || 'N/A'}</td>
                        <td>${person.department?.name || person.departmentName || 'N/A'}</td>
                        <td>${person.phone || 'N/A'}</td>
                        <td>${person.email || 'N/A'}</td>
                        <td>${person.statusEmployee || 'N/A'}</td>
                        <td>${person.isBlacklist ? 'Yes' : 'No'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${security.length > 0 ? `
              <div class="table-container">
                <h3>Security</h3>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Card Number</th>
                      <th>BLE Card Number</th>
                      <th>Organization</th>
                      <th>Department</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Blacklist</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${security.map((person, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td><strong>${person.name || 'N/A'}</strong></td>
                        <td>
                          <span class="badge badge-security">Security</span><br>
                          <small>${person.statusEmployee || 'N/A'}</small>
                        </td>
                        <td>${person.cardNumber || 'N/A'}</td>
                        <td>${person.bleCardNumber || 'N/A'}</td>
                        <td>${person.organization?.name || person.organizationName || 'N/A'}</td>
                        <td>${person.department?.name || person.departmentName || 'N/A'}</td>
                        <td>${person.phone || 'N/A'}</td>
                        <td>${person.email || 'N/A'}</td>
                        <td>${person.statusEmployee || 'N/A'}</td>
                        <td>${person.isBlacklist ? 'Yes' : 'No'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            ${totalPersons === 0 ? `
              <div class="no-data">
                <h3>No Person Data Available</h3>
                <p>No persons were detected at the time of generation.</p>
              </div>
            ` : ''}
            
            <div class="export-buttons">
              <button class="export-btn btn-excel" onclick="exportToExcel()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Export as Excel
              </button>
              <button class="export-btn btn-pdf" onclick="exportToPdf()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m9 15 3-3 3 3"></path><path d="M12 12v9"></path></svg>
                Export as PDF
              </button>
            </div>
          </div>
          
          <script>
            const personsData = ${JSON.stringify(personsData)};
            const filename = '${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_' + new Date().toISOString().split('T')[0];

            async function exportToExcel() {
              const workbook = new ExcelJS.Workbook();
              const worksheet = workbook.addWorksheet('Person Data');

              // Setup Columns
              const visitors = personsData.filter(p => p.type === 'visitor');
              const members = personsData.filter(p => p.type === 'member');

              if (visitors.length > 0) {
                worksheet.addRow(['VISITORS']).font = { bold: true, size: 14 };
                worksheet.addRow(['#', 'Name', 'Visitor Type', 'Card Number', 'BLE Card Number', 'Organization', 'Phone', 'Email', 'VIP', 'Blacklist']).font = { bold: true };
                
                visitors.forEach((p, i) => {
                  worksheet.addRow([
                    i + 1,
                    p.name || 'N/A',
                    p.visitorType || 'N/A',
                    p.cardNumber || 'N/A',
                    p.bleCardNumber || 'N/A',
                    p.organizationName || 'N/A',
                    p.phone || 'N/A',
                    p.email || 'N/A',
                    p.isVip ? 'Yes' : 'No',
                    p.isBlacklist ? 'Yes' : 'No'
                  ]);
                });
                worksheet.addRow([]); // Empty row
              }

              if (members.length > 0) {
                worksheet.addRow(['MEMBERS']).font = { bold: true, size: 14 };
                worksheet.addRow(['#', 'Name', 'Status', 'Card Number', 'BLE Card Number', 'Organization', 'Department', 'Phone', 'Email', 'Blacklist']).font = { bold: true };
                
                members.forEach((p, i) => {
                  worksheet.addRow([
                    i + 1,
                    p.name || 'N/A',
                    p.statusEmployee || 'N/A',
                    p.cardNumber || 'N/A',
                    p.bleCardNumber || 'N/A',
                    p.organization?.name || p.organizationName || 'N/A',
                    p.department?.name || p.departmentName || 'N/A',
                    p.phone || 'N/A',
                    p.email || 'N/A',
                    p.isBlacklist ? 'Yes' : 'No'
                  ]);
                });
              }

              // Auto-width columns
              worksheet.columns.forEach(column => {
                column.width = 20;
              });

              const buffer = await workbook.xlsx.writeBuffer();
              const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              saveAs(blob, filename + '.xlsx');
            }

            function exportToPdf() {
              const { jsPDF } = window.jspdf;
              const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
              
              doc.setFontSize(20);
              doc.text('${title}', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
              
              doc.setFontSize(10);
              doc.text('Generated: ' + new Date().toLocaleString(), doc.internal.pageSize.getWidth() / 2, 60, { align: 'center' });

              const visitors = personsData.filter(p => p.type === 'visitor');
              const members = personsData.filter(p => p.type === 'member');

              let currentY = 80;

              if (visitors.length > 0) {
                doc.setFontSize(14);
                doc.text('Visitors', 40, currentY);
                currentY += 10;

                doc.autoTable({
                  startY: currentY,
                  head: [['#', 'Name', 'Type', 'Card #', 'BLE Card #', 'Organization', 'Phone', 'Email', 'VIP', 'Blacklist']],
                  body: visitors.map((p, i) => [
                    i + 1,
                    p.name || 'N/A',
                    p.visitorType || 'N/A',
                    p.cardNumber || 'N/A',
                    p.bleCardNumber || 'N/A',
                    p.organizationName || 'N/A',
                    p.phone || 'N/A',
                    p.email || 'N/A',
                    p.isVip ? 'Yes' : 'No',
                    p.isBlacklist ? 'Yes' : 'No'
                  ]),
                  theme: 'striped',
                  styles: { fontSize: 8 },
                  headStyles: { fillColor: [25, 118, 210] }
                });
                currentY = doc.lastAutoTable.finalY + 30;
              }

              if (members.length > 0) {
                if (currentY + 50 > doc.internal.pageSize.getHeight()) {
                  doc.addPage();
                  currentY = 40;
                }
                
                doc.setFontSize(14);
                doc.text('Members', 40, currentY);
                currentY += 10;

                doc.autoTable({
                  startY: currentY,
                  head: [['#', 'Name', 'Status', 'Card #', 'BLE Card #', 'Org', 'Dept', 'Phone', 'Email', 'Blacklist']],
                  body: members.map((p, i) => [
                    i + 1,
                    p.name || 'N/A',
                    p.statusEmployee || 'N/A',
                    p.cardNumber || 'N/A',
                    p.bleCardNumber || 'N/A',
                    p.organization?.name || p.organizationName || 'N/A',
                    p.department?.name || p.departmentName || 'N/A',
                    p.phone || 'N/A',
                    p.email || 'N/A',
                    p.isBlacklist ? 'Yes' : 'No'
                  ]),
                  theme: 'striped',
                  styles: { fontSize: 8 },
                  headStyles: { fillColor: [46, 125, 50] }
                });
              }

              doc.save(filename + '.pdf');
            }
            
            // Add keyboard shortcut for export (Ctrl+E or Cmd+E defaults to Excel)
            document.addEventListener('keydown', function(e) {
              if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                exportToExcel();
              }
            });
          </script>
        </body>
      </html>
    `;

  };

  // Function to open a new window with person data
  const openPersonDataWindow = (title: string, personsData: any[], type: 'building' | 'floor' | 'floorplan' | 'area', isDarkMode: boolean) => {
    if (personsData.length === 0) {
      alert(`No person data available for ${title}`);
      return null;
    }
    
    // Generate HTML content
    const htmlContent = generatePersonWindowHTML(title, personsData, type, isDarkMode);
    
    // Open new window
    const newWindow = window.open('', '_blank', 'width=1400,height=800,menubar=no,toolbar=no,location=no,status=no');
    
    if (!newWindow) {
      alert('Popup blocked. Please allow popups for this site.');
      return null;
    }
    
    // Write HTML to new window
    newWindow.document.open();
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Focus the new window
    newWindow.focus();
    
    return newWindow;
  };

  // Function to get person data from countingData
  const getPersonsFromCountingData = (type: 'building' | 'floor' | 'floorplan' | 'area', id: string) => {
    if (!countingData) {
      console.log(`No counting data available`);
      return [];
    }
    
    // Safely access the data by type
    const typeData = countingData[type];
    if (!typeData) {
      console.log(`No data available for type: ${type}`);
      return [];
    }
    
    const data = typeData[id];
    if (!data) {
      console.log(`No data found for ${type} with ID: ${id}`);
      return [];
    }
    
    const persons: any[] = [];
    
    // Check if data has persons property with the correct structure
    const personsData = data.persons;
    console.log("personsData", data);
    // Get visitor IDs and map to visitor data
    if (personsData?.visitor && Array.isArray(personsData.visitor)) {
      personsData.visitor.forEach((visitorId: string) => {
        console.log(`Visitor ID: ${visitorId}`);
        console.log(visitorMap);
        const visitor = visitorMap[visitorId];
        if (visitor) {
          persons.push({
            ...visitor,
            type: 'visitor'
          });
        } else {
          console.log(`Visitor with ID ${visitorId} not found in visitor data`);
          // Add a placeholder if visitor not found
          persons.push({
            id: visitorId,
            name: `Unknown Visitor (${visitorId})`,
            type: 'visitor'
          });
        }
      });
    }
    
    // Get member IDs and map to member data
    if (personsData?.member && Array.isArray(personsData.member)) {
      personsData.member.forEach((memberId: string) => {
        const member = memberMap[memberId];
        if (member) {
          persons.push({
            ...member,
            type: 'member'
          });
        } else {
          console.log(`Member with ID ${memberId} not found in member data`);
          // Add a placeholder if member not found
          persons.push({
            id: memberId,
            name: `Unknown Member (${memberId})`,
            type: 'member'
          });
        }
      });
    }

    // Get security IDs and map to security data
    if (personsData?.security && Array.isArray(personsData.security)) {
      personsData.security.forEach((securityId: string) => {
        const security = securityMap[securityId];
        if (security) {
          persons.push({
            ...security,
            type: 'security'
          });
        } else {
          console.log(`Security with ID ${securityId} not found in security data`);
          // Add a placeholder if security not found
          persons.push({
            id: securityId,
            name: `Unknown Security (${securityId})`,
            type: 'security'
          });
        }
      });
    }
    
    return persons;
  };

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Function to handle building click
  const handleBuildingClick = useCallback((buildingId: string) => {
    console.log(`Building ID: ${buildingId}`);
    
    // Find building name
    const building = buildingData.find(b => b.id === buildingId);
    const buildingName = building ? building.name : `Building ${buildingId}`;
    
    // Get person data from countingData
    const personsData = getPersonsFromCountingData('building', buildingId);
    
    if (personsData.length > 0) {
      // Open new window with static data snapshot
      openPersonDataWindow(`Persons in ${buildingName}`, personsData, 'building', isDarkMode);
      
      // Also log to console for debugging
      console.log(`Found ${personsData.length} person(s) in building ${buildingName} (snapshot)`);
    } else {
      console.log(`No persons found in building "${buildingName}" (${buildingId})`);
      alert(`No persons found in building: ${buildingName}`);
    }
  }, [buildingData, countingData, isDarkMode, visitorMap, memberMap]);

  // Function to handle floor click
  const handleFloorClick = useCallback((floorId: string) => {
    console.log(`Floor ID: ${floorId}`);
    
    // Find floor name
    const floor = floorData.find(f => f.id === floorId);
    const floorName = floor ? floor.name : `Floor ${floorId}`;
    
    // Get person data from countingData
    const personsData = getPersonsFromCountingData('floor', floorId);
    console.log(personsData, floorId);
    
    if (personsData.length > 0) {
      // Open new window with static data snapshot
      openPersonDataWindow(`Persons in ${floorName}`, personsData, 'floor', isDarkMode);
      
      // Also log to console for debugging
      console.log(`Found ${personsData.length} person(s) in floor ${floorName} (snapshot)`);
    } else {
      console.log(`No persons found in floor "${floorName}" (${floorId})`);
      alert(`No persons found in floor: ${floorName}`);
    }
  }, [floorData, countingData, isDarkMode, visitorMap, memberMap]);

  // Function to handle floorplan click
  const handleFloorplanClick = useCallback((floorplanId: string) => {
    console.log(`Floorplan ID: ${floorplanId}`);
    
    // Find floorplan name
    const floorplan = floorplanData.find(fp => fp.id === floorplanId);
    const floorplanName = floorplan ? floorplan.name : `Floorplan ${floorplanId}`;
    
    // Get person data from countingData
    const personsData = getPersonsFromCountingData('floorplan', floorplanId);
    
    if (personsData.length > 0) {
      // Open new window with static data snapshot
      openPersonDataWindow(`Persons in ${floorplanName}`, personsData, 'floorplan', isDarkMode);
      
      // Also log to console for debugging
      console.log(`Found ${personsData.length} person(s) in floorplan ${floorplanName} (snapshot)`);
    } else {
      console.log(`No persons found in floorplan "${floorplanName}" (${floorplanId})`);
      alert(`No persons found in floorplan: ${floorplanName}`);
    }
  }, [floorplanData, countingData, isDarkMode, visitorMap, memberMap]);

  // Function to handle area click
  const handleAreaClick = useCallback((areaId: string) => {
    console.log(`Area ID: ${areaId}`);
    
    // Find area name
    const area = areaData.find(a => a.id === areaId);
    const areaName = area ? area.name : `Area ${areaId}`;
    
    // Get person data from countingData
    const personsData = getPersonsFromCountingData('area', areaId);
    
    if (personsData.length > 0) {
      // Open new window with static data snapshot
      openPersonDataWindow(`Persons in ${areaName}`, personsData, 'area', isDarkMode);
      
      // Also log to console for debugging
      console.log(`Found ${personsData.length} person(s) in area ${areaName} (snapshot)`);
    } else {
      console.log(`No persons found in area "${areaName}" (${areaId})`);
      alert(`No persons found in area: ${areaName}`);
    }
  }, [areaData, countingData, isDarkMode, visitorMap, memberMap]);

  // Calculate total occupancy across all building entities or countingData
  const totalOccupancy = useMemo(() => {
    if (!buildingData || buildingData.length === 0) return 0;
    return buildingData.reduce((sum, item) => sum + (item.count || 0), 0);
  }, [buildingData]);

  // Format timestamp for display
  const formattedTime = useMemo(() => {
    if (!countingData?.time) return new Date().toLocaleString();
    try {
      return new Date(countingData.time).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (e) {
      return countingData.time;
    }
  }, [countingData]);

  // Show loading state if no counting data yet
  if (!countingData) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <Typography variant="body1">Loading counting data...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner: Total Occupancy & Timestamp */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2,
            py: 1,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
          }}
        >
          {/* Occupancy Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
                color: '#2563eb',
                width: 36,
                height: 36,
                borderRadius: 2,
                '& svg': { fontSize: '1.2rem' },
              }}
            >
              <PeopleIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1, fontSize: '0.72rem' }}>
                Total Occupancy
              </Typography>
              <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ lineHeight: 1.1 }}>
                {totalOccupancy}
              </Typography>
            </Box>
          </Box>

          {/* Last Updated Timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: 'text.secondary',
                width: 30,
                height: 30,
                borderRadius: 1.5,
                '& svg': { fontSize: '1rem' },
              }}
            >
              <TimeIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1, fontSize: '0.72rem' }}>
                Last Updated
              </Typography>
              <Typography variant="body2" fontWeight="600" color="text.primary" sx={{ fontSize: '0.8rem' }}>
                {formattedTime}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Grid of 4 Statistic Cards */}
      <Grid container spacing={1.5} sx={{ flex: 1 }}>
        <Grid item xs={12} md={6}>
          <StatisticTable
            title="Buildings"
            subtitle="People count by building"
            unitSingular="Building"
            unitPlural="Buildings"
            icon={<BuildingIcon />}
            iconBgColor={theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff'}
            iconColor="#2563eb"
            data={buildingData}
            onRowClick={handleBuildingClick}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatisticTable
            title="Floors"
            subtitle="People count by floor"
            unitSingular="Floor"
            unitPlural="Floors"
            icon={<FloorIcon />}
            iconBgColor={theme.palette.mode === 'dark' ? 'rgba(147, 51, 234, 0.2)' : '#faf5ff'}
            iconColor="#9333ea"
            data={floorData}
            onRowClick={handleFloorClick}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatisticTable
            title="Floorplans"
            subtitle="People count by floorplan"
            unitSingular="Floorplan"
            unitPlural="Floorplans"
            icon={<FloorplanIcon />}
            iconBgColor={theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.2)' : '#f0fdf4'}
            iconColor="#16a34a"
            data={floorplanData}
            onRowClick={handleFloorplanClick}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatisticTable
            title="Areas"
            subtitle="People count by area"
            unitSingular="Area"
            unitPlural="Areas"
            icon={<AreaIcon />}
            iconBgColor={theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.2)' : '#fff7ed'}
            iconColor="#ea580c"
            data={areaData}
            onRowClick={handleAreaClick}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Statistic;