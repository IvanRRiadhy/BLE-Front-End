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
  Avatar,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  fetchTrackingTrans,
  fetchTrackingTransDT,
  trackingTransType,
} from 'src/store/apps/crud/trackingTrans';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useTranslation } from 'react-i18next';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import { defaultTrackingTransFilter } from 'src/store/apps/defaultForm';
import { useEnrichedTrackingLogs } from 'src/hooks/useTrackingLogs';
import { BASE_URL } from 'src/utils/axios';

const dummyData: trackingTransType[] = [
  {
    //ff8
    id: '123jao-144122-ajo291-oo09kk',
    transTime: '2023-06-01T12:00:00Z',
    readerId: 'a0773223-cc89-4ba1-ba5a-68a2fb26ea1b',
    floorplanMaskedAreaId: 'ee35e6f3-8661-437b-93d7-6ae86fbe2f67',
    cardId: 'BC572913EA8B',
    coordinateX: 10,
    coordinateY: 20,
    coordinatePxX: 100,
    coordinatePxY: 200,
    alarmStatus: 'Normal',
    battery: 80,
  },
  {
    //898
    id: '8fj29a-kd921j-pl0k91-zx8nq2',
    transTime: '2023-06-01T12:05:00Z',
    readerId: '3b97ab06-bb48-4cda-9411-647fc98ff945',
    cardId: 'BC572913EA73',
    floorplanMaskedAreaId: '88ca769e-dafb-445e-b79f-8ab47c32309d',
    coordinateX: 30,
    coordinateY: 40,
    coordinatePxX: 300,
    coordinatePxY: 400,
    alarmStatus: 'Alarm',
    battery: 60,
  },
  {
    //FBC
    id: 'bsdw836-8bf3-496c-a786-27d2988fad04',
    transTime: '2023-06-01T12:10:00Z',
    readerId: 'b0f9e836-8bf3-496c-a786-27d2988fad04',
    cardId: 'BC572913EA73',
    floorplanMaskedAreaId: '88ca769e-dafb-445e-b79f-8ab47c32309d',
    coordinateX: 50,
    coordinateY: 60,
    coordinatePxX: 500,
    coordinatePxY: 600,
    alarmStatus: 'Normal',
    battery: 90,
  },
  {
    //FBC
    id: 'a9i23sd-8bf3-496c-a786-27d2988fad04',
    transTime: '2023-06-01T12:15:00Z',
    readerId: 'b0f9e836-8bf3-496c-a786-27d2988fad04',
    cardId: 'BC572913EA73',
    floorplanMaskedAreaId: '88ca769e-dafb-445e-b79f-8ab47c32309d',
    coordinateX: 70,
    coordinateY: 80,
    coordinatePxX: 700,
    coordinatePxY: 800,
    alarmStatus: 'Alarm',
    battery: 70,
  },
  {
    //ff8
    id: 'zld89q-mc20sl-qpw9a2-jdk2lw',
    transTime: '2023-06-01T12:20:00Z',
    readerId: 'a0773223-cc89-4ba1-ba5a-68a2fb26ea1b',
    cardId: 'BC572913EA8B',
    floorplanMaskedAreaId: 'ee35e6f3-8661-437b-93d7-6ae86fbe2f67',
    coordinateX: 90,
    coordinateY: 100,
    coordinatePxX: 900,
    coordinatePxY: 1000,
    alarmStatus: 'Normal',
    battery: 80,
  },
];

type Props = {
  isNew?: boolean;
  focusType?: string;
  focusId?: string;
};

const TrackingTransactionList = ({ isNew, focusType, focusId }: Props) => {
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
  const trackingLogs = useEnrichedTrackingLogs();
  // const trackingTransData = dummyData;
  const readerData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const floorplanMaskedAreaData = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreas,
  );
  const membersData = useSelector(
    (state: RootState) => state.memberReducer.members,
  ) as memberType[];
  const visitorsData = useSelector(
    (state: RootState) => state.visitorReducer.visitors,
  ) as VisitorType[];

  const findNewestTransaction = (data: trackingTransType[]) => {
    if (data.length === 0) return null;

    return data.reduce((newest, current) => {
      return new Date(current.transTime) > new Date(newest.transTime) ? current : newest;
    });
  };

  const newestTransaction = findNewestTransaction(dummyData);

  useEffect(() => {
    dispatch(fetchTrackingTransDT({ ...defaultTrackingTransFilter }));
    dispatch(fetchBleReaders());
    // dispatch(fetchMaskedAreas());
    dispatch(fetchMembers());
    dispatch(fetchVisitor());
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

  const formatCoords = (coordinateX: number, coordinateY: number) => {
    return `(${coordinateX}, ${coordinateY})`;
  };

  const getName = (cardNumber: string) => {
    const person = [...membersData, ...visitorsData].find((p) => p.bleCardNumber === cardNumber);
    const isVisitor = visitorsData.some((v) => v.bleCardNumber === cardNumber);
    const isMember = membersData.some((m) => m.bleCardNumber === cardNumber);
    const label = person?.name || 'Person';
    return { label, isVisitor, isMember };
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
                    <TableCell
                      sx={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        background: 'white',
                        zIndex: 2,
                        width: '70px',
                      }}
                    >
                      <Typography variant="h6"></Typography>
                    </TableCell>

                    {[
                      // 'Image',
                      'Person Name',
                      'Area',
                      'Time',
                      'Card Number',
                      'Type',
                      'Alarm',
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}
                      >
                        <Typography variant="h6">{header}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {trackingLogs
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((log, index) => {
                      const isAlarm = log.type === 'Alarm';
                      const isVisitor = log.personType === 'Visitor';
                      const isMember = log.personType === 'Member';
                      // console.log('log', log);
                      return (
                        <TableRow key={log.id}>
                          {/* Avatar */}
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              background: 'white',
                              zIndex: 1,
                              width: '70px',
                            }}
                          >
                            <Grid size={2}>
                              <Avatar
                                src={`${BASE_URL}${log.image}`}
                                sx={{
                                  width: 50,
                                  height: 50,
                                  border: '3px solid',
                                  borderColor: isVisitor ? '#f50057' : '#1976d2',
                                }}
                              />
                            </Grid>
                          </TableCell>

                          {/* Image */}
                          {/* <TableCell>
            
          </TableCell> */}

                          {/* Person Name */}
                          <TableCell>
                            <Typography fontWeight={600}>{log.target}</Typography>
                          </TableCell>

                          {/* Area - Floor */}
                          <TableCell>
                            {log.area} – {log.floor}
                          </TableCell>

                          {/* Time */}
                          <TableCell>{formatTime(log.time)}</TableCell>

                          {/* Card Number */}
                          <TableCell>{log.dmac}</TableCell>

                          {/* Type */}
                          <TableCell>
                            {isVisitor ? 'Visitor' : isMember ? 'Member' : 'Unknown'}
                          </TableCell>

                          {/* Alarm */}
                          <TableCell>
                            {isAlarm ? (
                              <Typography color="error" fontWeight={600}>
                                Yes
                              </Typography>
                            ) : (
                              'No'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            {!isNew && (
              <TablePagination
                rowsPerPageOptions={[]}
                component="div"
                count={trackingLogs.length}
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

export default TrackingTransactionList;
