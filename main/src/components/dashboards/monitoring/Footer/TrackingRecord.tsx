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
import { fetchTrackingTrans, fetchTrackingTransDT, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useTranslation } from 'react-i18next';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, masterVisitorType, VisitorType } from 'src/store/apps/crud/visitor';
import { defaultTrackingTransFilter } from 'src/store/apps/defaultForm';

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
};

const TrackingTransactionList = ({ isNew }: Props) => {
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
  const trackingTransData = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
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
    dispatch(fetchTrackingTransDT({...defaultTrackingTransFilter}));
    dispatch(fetchBleReaders());
    dispatch(fetchMaskedAreas());
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

  const getReaderName = (readerId: string) => {
    const reader = readerData.find((rd: bleReaderType) => rd.id === readerId);
    return reader ? reader.name : 'Unknown Reader';
  };

  const getFloorplanMaskedAreaName = (areaId: string) => {
    const area = floorplanMaskedAreaData.find((fl: MaskedAreaType) => fl.id === areaId);
    return area ? area.name : 'Unknown Area';
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
                      // 'ID',
                      'Trans Time',
                      'Reader Name',
                      'Card Holder Name',
                      'Floorplan Name',
                      'Coordinate',
                      'Alarm Status',
                      'Battery',
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
                    : trackingTransData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  )
                    .filter((item) => item !== null) // Ensure no null values are rendered
                    .map((trackingTrans: trackingTransType, index) => {
                      const { label, isVisitor, isMember } = getName(trackingTrans.cardId);
                      return (
                        <TableRow key={trackingTrans.id}>
                          <TableCell
                            sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                          >
                            {isNew ? 1 : index + 1} {/* Show "1" if isNew is true */}
                          </TableCell>
                          {/* <TableCell>{trackingTrans.id}</TableCell> */}
                          <TableCell>{formatTime(trackingTrans.transTime)}</TableCell>
                          <TableCell>{trackingTrans.reader?.name}</TableCell>
                          <TableCell>
                            {isVisitor ? '(Visitor) ' : isMember ? '(Member) ' : 'Unknown'} {label}
                          </TableCell>
                          <TableCell>
                            {trackingTrans.floorplanMaskedArea?.name ?? 'Unknown Area'}
                          </TableCell>
                          <TableCell>
                            {formatCoords(trackingTrans.coordinateX, trackingTrans.coordinateY)}
                          </TableCell>
                          <TableCell>{trackingTrans.alarmStatus}</TableCell>
                          <TableCell>{trackingTrans.battery}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            {!isNew && (
              <TablePagination
                rowsPerPageOptions={[]}
                component="div"
                count={trackingTransData.length}
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
