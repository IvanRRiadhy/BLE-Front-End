import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid2 as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  Divider,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { fetchAlarm, AlarmType } from 'src/store/apps/crud/alarmRecordTracking';
import { useTranslation } from 'react-i18next';

type Props = {
  isNew?: boolean;
};

const AlarmList = ({ isNew }: Props) => {
  const { t } = useTranslation();
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 rows per page
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(event);
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const dispatch: AppDispatch = useDispatch();
  const alarmRecordList = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );

  const findNewestTransaction = (data: AlarmType[]) => {
    if (data.length === 0) return null;

    return data.reduce((newest, current) => {
      return new Date(current.timestamp) > new Date(newest.timestamp) ? current : newest;
    });
  };
  const newestTransaction = findNewestTransaction(alarmRecordList);

  useEffect(() => {
    dispatch(fetchAlarm());
  }, [dispatch]);

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

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%', width: '100%', height: '100%' }}>
          <BlankCard>
            <TableContainer sx={{ maxHeight: '200px', overflowY: 'auto' }}>
              <Table aria-label="simple table" sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Empty Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        background: 'white',
                        zIndex: 2,
                        width: '50px',
                      }}
                    >
                      <Typography variant="h6"> No </Typography>
                    </TableCell>
                    {[
                      'ID',
                      'Time',
                      'Visitor Name',
                      'Reader',
                      'Alarm Status',
                      'Action Status',
                      'Area ID',
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          position: 'sticky',
                          top: 0, // Ensure the header sticks to the top
                          background: 'white',
                          zIndex: 1,
                        }}
                      >
                        <Typography variant="h6">{header}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(isNew
                    ? [newestTransaction]
                    : alarmRecordList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  )
                    .filter((item) => item !== null) // Ensure no null values are rendered
                    .map((alarmRecordData: AlarmType, index) => (
                      <TableRow key={alarmRecordData.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {isNew ? 1 : index + 1} {/* Show "1" if isNew is true */}
                        </TableCell>
                        <TableCell>{alarmRecordData.id}</TableCell>
                        <TableCell>{formatTime(alarmRecordData.timestamp)}</TableCell>
                        <TableCell>{alarmRecordData.visitor.name}</TableCell>
                        <TableCell>{alarmRecordData.reader.name}</TableCell>
                        <TableCell>{alarmRecordData.alarmRecordStatus}</TableCell>
                        <TableCell>{alarmRecordData.actionStatus}</TableCell>
                        <TableCell>{alarmRecordData.floorplanMaskedArea.id}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            {!isNew && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={alarmRecordList.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            )}
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default AlarmList;
