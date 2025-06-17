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
import { blacklistType } from 'src/store/apps/crud/blacklist';

const blacklist = BlacklistData;
interface BlacklistTableProps {
  blacklistData: blacklistType[];
}

const BlacklistTable: React.FC<BlacklistTableProps> = ({ blacklistData }) => {
  // ...rest of your code...

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

  const sortedData = [...blacklistData].sort((a, b) => {
  if (orderBy === 'name') {
    const nameA = a.visitor?.name ?? '';
    const nameB = b.visitor?.name ?? '';
    return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  }
  if (orderBy === 'maskedArea') {
    const areaA = a.floorplanMaskedArea?.name ?? '';
    const areaB = b.floorplanMaskedArea?.name ?? '';
    return order === 'asc'
      ? areaA.localeCompare(areaB)
      : areaB.localeCompare(areaA);
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
                  active={orderBy === 'maskedArea'}
                  direction={orderBy === 'maskedArea' ? order : 'asc'}
                  onClick={() => handleSort('maskedArea')}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('Area')}
                  </Typography>
                </TableSortLabel>
              </TableCell>
              {/* Duration Column */}
              {/* <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('Duration')}
                </Typography>
              </TableCell> */}
              {/* Information Column */}
              {/* <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  {t('Information')}
                </Typography>
              </TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((basic) => (
              <TableRow key={basic.id}>
                <TableCell>
                  <Stack direction="row" spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {basic.visitor?.name || 'Unknown Visitor'}
                      </Typography>
                      <Typography color="textSecondary" fontSize="12px" variant="subtitle2">
                        {basic.visitor?.cardNumber || 'No Card Number'}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography color="textSecondary" fontWeight={400} variant="subtitle2">
                    {basic.floorplanMaskedArea?.name || 'Unknown Area'}
                  </Typography>
                </TableCell>
                {/* <TableCell>
                  <Typography color="textSecondary" fontWeight={400} variant="subtitle2">
                    {basic.duration}
                  </Typography>
                </TableCell> */}
                {/* <TableCell>
                  <Typography color="textSecondary" fontWeight={400} variant="subtitle2">
                    {basic.keterangan}
                  </Typography>
                </TableCell> */}
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
