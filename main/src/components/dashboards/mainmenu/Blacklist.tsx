import React, { useState } from 'react';
import BlacklistData from './BlaclistData';
import { property, set } from 'lodash';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Stack,
  TablePagination,
} from '@mui/material';
import { Box } from '@mui/system';
import DashboardCard from 'src/components/shared/DashboardCard';
import { useTranslation } from 'react-i18next';

const blacklist = BlacklistData;

const BlacklistTable = () => {
  //Pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const { t } = useTranslation();
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  //Sorting
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<string>('name');

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedData = [...blacklist].sort((a, b) => {
    if (orderBy === 'name') {
      return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    if (orderBy === 'dateAsigned') {
      return order === 'asc'
        ? a.dateAsigned.localeCompare(b.dateAsigned)
        : b.dateAsigned.localeCompare(a.dateAsigned);
    }
    return 0;
  });

  return (
    <DashboardCard title="Blacklist">
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
              {/* Date Asigned Column */}
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'dateAsigned'}
                  direction={orderBy === 'dateAsigned' ? order : 'asc'}
                  onClick={() => handleSort('dateAsigned')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Date Assigned')}
                  </Typography>
                </TableSortLabel>
              </TableCell>
              {/* Duration Column */}
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('Duration')}
                </Typography>
              </TableCell>
              {/* Information Column */}
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('Information')}
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((basic) => (
              <TableRow key={basic.id}>
                <TableCell>
                  <Stack direction="row" spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {basic.name}
                      </Typography>
                      <Typography color="textSecondary" fontSize="12px" variant="subtitle2">
                        {basic.cardID}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" fontWeight={400} variant="subtitle2">
                    {basic.dateAsigned}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" fontWeight={400} variant="subtitle2">
                    {basic.duration}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" fontWeight={400} variant="subtitle2">
                    {basic.keterangan}
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
        count={blacklist.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        labelRowsPerPage={t('Rows Per Page')}
      />
    </DashboardCard>
  );
};

export default BlacklistTable;
