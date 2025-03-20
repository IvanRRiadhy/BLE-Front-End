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

const performers = AlarmWarningData;

const AlarmWarning = () => {
  // for select
  const [month, setMonth] = React.useState('1');
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

  //Sorting
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = React.useState<string>('name');

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedData = [...performers].sort((a, b) => {
    const priorityOrder: Record<'High' | 'Medium' | 'Low', number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };
    if (orderBy === 'name') {
      return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    if (orderBy === 'area') {
      return order === 'asc' ? a.area.localeCompare(b.area) : b.area.localeCompare(a.area);
    }
    if (orderBy === 'priority') {
      return order === 'asc'
        ? priorityOrder[a.status as 'High' | 'Medium' | 'Low'] -
            priorityOrder[b.status as 'High' | 'Medium' | 'Low']
        : priorityOrder[b.status as 'High' | 'Medium' | 'Low'] -
            priorityOrder[a.status as 'High' | 'Medium' | 'Low'];
    }
    if (orderBy === 'triggerTime') {
      return order === 'asc'
        ? a.triggerTime.localeCompare(b.triggerTime)
        : b.triggerTime.localeCompare(a.triggerTime);
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
          <MenuItem value={1}>March 2023</MenuItem>
          <MenuItem value={2}>April 2023</MenuItem>
          <MenuItem value={3}>May 2023</MenuItem>
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
                  active={orderBy === 'priority'}
                  direction={orderBy === 'priority' ? order : 'asc'}
                  onClick={() => handleSort('priority')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Priority')}
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
            {sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((basic) => (
              <TableRow key={basic.id}>
                <TableCell>
                  <Stack direction="row" spacing={2}>
                    <Avatar src={basic.imgsrc} alt={basic.imgsrc} sx={{ width: 40, height: 40 }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {basic.name}
                      </Typography>
                      <Typography color="textSecondary" fontSize="12px" variant="subtitle2">
                        {basic.post}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                    {t('Room') + ' ' + basic.area}
                  </Typography>
                </TableCell>
                <TableCell>
                  {/* <Chip chipcolor={basic.status == 'Active' ? 'success' : basic.status == 'Pending' ? 'warning' : basic.status == 'Completed' ? 'primary' : basic.status == 'Cancel' ? 'error' : 'secondary'} */}
                  <Chip
                    sx={{
                      bgcolor:
                        basic.status === 'High'
                          ? (theme) => theme.palette.error.light
                          : basic.status === 'Medium'
                          ? (theme) => theme.palette.warning.light
                          : basic.status === 'Low'
                          ? (theme) => theme.palette.success.light
                          : (theme) => theme.palette.secondary.light,
                      color:
                        basic.status === 'High'
                          ? (theme) => theme.palette.error.main
                          : basic.status === 'Medium'
                          ? (theme) => theme.palette.warning.main
                          : basic.status === 'Low'
                          ? (theme) => theme.palette.success.main
                          : (theme) => theme.palette.secondary.main,
                      borderRadius: '8px',
                    }}
                    size="small"
                    label={t(`${basic.status}`)}
                  />
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                    {basic.triggerTime}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Component */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={performers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </DashboardCard>
  );
};

export default AlarmWarning;
