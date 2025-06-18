// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import DashboardCard from '../../shared/DashboardCard';
import CustomSelect from '../../forms/theme-elements/CustomSelect';
import {
  MenuItem,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  TableContainer,
  Stack,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import AlarmWarningData from './AlarmWarningData';
import { useTranslation } from 'react-i18next';
import { AlarmType } from 'src/store/apps/crud/alarmRecordTracking';

const performers = AlarmWarningData;
interface AlarmTableProps {
  alarmData: AlarmType[];
}

const AlarmWarning: React.FC<AlarmTableProps> = ({ alarmData = [] }) => {
  // for select
  const { t } = useTranslation();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(event.target.value);
  };

  //Pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };

    const getMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      // Use ISO format for value, readable for label
      return { value: `${year}-${date.getMonth() + 1}`, label: `${month} ${year}` };
    };
    const today = new Date();
  const todayMonth = {
    value: `${today.getFullYear()}-${today.getMonth() + 1}`,
    label: today.toLocaleString('default', { month: 'long' }) + ' ' + today.getFullYear(),
  };
  
    const allMonths = [
      ...alarmData.map((d) => getMonthYear(d.timestamp)),
      todayMonth,
    ].filter(Boolean);
  
    const uniqueMonthsMap = new Map();
    allMonths.forEach((m) => {
      if (m) uniqueMonthsMap.set(m.value, m.label);
    });
    const uniqueMonths = Array.from(uniqueMonthsMap, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.value.localeCompare(b.value),
    );
      const [month, setMonth] = React.useState(todayMonth.value);

  //Sorting
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = React.useState<string>('name');

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  const filteredAlarmData = alarmData.filter((alarm) => {
  if (!alarm.timestamp) return false;
  const date = new Date(alarm.timestamp);
  const alarmMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
  return alarmMonth === month;
});

  const sortedData = [...filteredAlarmData].sort((a, b) => {
    // const priorityOrder: Record<'High' | 'Medium' | 'Low', number> = {
    //   High: 3,
    //   Medium: 2,
    //   Low: 1,
    // };
    if (orderBy === 'name') {
      const nameA = a.visitor?.name ?? '';
      const nameB = b.visitor?.name ?? '';
      return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    if (orderBy === 'maskedArea') {
      const areaA = a.floorplanMaskedArea?.name ?? '';
      const areaB = b.floorplanMaskedArea?.name ?? '';
      return order === 'asc' ? areaA.localeCompare(areaB) : areaB.localeCompare(areaA);
    }
    if (orderBy === 'timeStamp') {
      const areaA = a.timestamp ?? '';
      const areaB = b.timestamp ?? '';
      return order === 'asc' ? areaA.localeCompare(areaB) : areaB.localeCompare(areaA);
    }
    return 0;
  });

  return (
    <DashboardCard
      title={t('Alarm Warning')}
      action={
        <CustomSelect
          labelId="month-dd"
          id="month-dd"
          size="small"
          value={month}
          onChange={handleChange}
        >
          {uniqueMonths.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </CustomSelect>
      }
    >
      <TableContainer>
        <Table
          aria-label="simple table"
          sx={{
            whiteSpace: 'nowrap',
          }}
        >
          <TableHead>
            <TableRow>
              {/* Name Column */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Visitor')}
                  </Typography>
                </TableSortLabel>
              </TableCell>
              {/* Area Column */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'area'}
                  direction={orderBy === 'area' ? order : 'asc'}
                  onClick={() => handleSort('area')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Room')}
                  </Typography>
                </TableSortLabel>
              </TableCell>
              {/* Priority Column */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'Actioin Status'}
                  direction={orderBy === 'Actioin Status' ? order : 'asc'}
                  onClick={() => handleSort('Actioin Status')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Actioin Status')}
                  </Typography>
                </TableSortLabel>
              </TableCell>
              {/* Trigger Time Column */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'triggerTime'}
                  direction={orderBy === 'triggerTime' ? order : 'asc'}
                  onClick={() => handleSort('triggerTime')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Trigger Time')}
                  </Typography>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((alarm) => (
              <TableRow key={alarm.id}>
                <TableCell>
                  <Stack direction="row" spacing={2}>
                    <Avatar
                      src={alarm.visitor?.faceImage}
                      alt={alarm.visitor?.faceImage}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {alarm.visitor?.name || 'Unknown Visitor'}
                      </Typography>
                      <Typography color="textSecondary" fontSize="12px" variant="subtitle2">
                        {alarm.visitor?.cardNumber || 'No Card Number'}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                    {alarm.floorplanMaskedArea?.name || 'Unknown Area'}
                  </Typography>
                </TableCell>
                {/* <TableCell>
                  <Chip
                    sx={{
                      bgcolor:
                        alarm.status === 'High'
                          ? (theme) => theme.palette.error.light
                          : alarm.status === 'Medium'
                          ? (theme) => theme.palette.warning.light
                          : alarm.status === 'Low'
                          ? (theme) => theme.palette.success.light
                          : (theme) => theme.palette.secondary.light,
                      color:
                        alarm.status === 'High'
                          ? (theme) => theme.palette.error.main
                          : alarm.status === 'Medium'
                          ? (theme) => theme.palette.warning.main
                          : alarm.status === 'Low'
                          ? (theme) => theme.palette.success.main
                          : (theme) => theme.palette.secondary.main,
                      borderRadius: '8px',
                    }}
                    size="small"
                    label={t(`${alarm.status}`)}
                  />
                </TableCell> */}
                <TableCell>
                  <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                    {alarm.actionStatus || ''}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                    {alarm.timestamp ? formatTime(alarm.timestamp) : 'Unknown Time'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {Array.from({
              length: rowsPerPage - Math.min(rowsPerPage, sortedData.length - page * rowsPerPage),
            }).map((_, idx) => (
              <TableRow key={`empty-row-${idx}`} style={{ height: 63 }}>
                <TableCell colSpan={4} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Component */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={alarmData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </DashboardCard>
  );
};

export default AlarmWarning;
