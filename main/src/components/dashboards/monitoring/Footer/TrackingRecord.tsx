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
import { fetchTrackingTrans, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useTranslation } from 'react-i18next';

const dummyData: trackingTransType[] = [
  {
    id: '123jao-144122-ajo291-oo09kk',
    transTime: '2023-06-01T12:00:00Z',
    readerId: '1',
    cardId: 123456,
    floorplanId: '1',
    coordinateX: 10,
    coordinateY: 20,
    coordinatePxX: 100,
    coordinatePxY: 200,
    alarmStatus: 'Normal',
    battery: 80,
  },
  {
    id: '8fj29a-kd921j-pl0k91-zx8nq2',
    transTime: '2023-06-01T12:05:00Z',
    readerId: '2',
    cardId: 654321,
    floorplanId: '2',
    coordinateX: 30,
    coordinateY: 40,
    coordinatePxX: 300,
    coordinatePxY: 400,
    alarmStatus: 'Alarm',
    battery: 60,
  },
  {
    id: 'ma01lz-92jdf9-qpwlek-a91kd0',
    transTime: '2023-06-01T12:10:00Z',
    readerId: '3',
    cardId: 987654,
    floorplanId: '3',
    coordinateX: 50,
    coordinateY: 60,
    coordinatePxX: 500,
    coordinatePxY: 600,
    alarmStatus: 'Normal',
    battery: 90,
  },
  {
    id: '9q1lms-0sd8fj-zx9kla-293kdw',
    transTime: '2023-06-01T12:15:00Z',
    readerId: '4',
    cardId: 321654,
    floorplanId: '4',
    coordinateX: 70,
    coordinateY: 80,
    coordinatePxX: 700,
    coordinatePxY: 800,
    alarmStatus: 'Alarm',
    battery: 70,
  },
  {
    id: 'zld89q-mc20sl-qpw9a2-jdk2lw',
    transTime: '2023-06-01T12:20:00Z',
    readerId: '5',
    cardId: 765432,
    floorplanId: '5',
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
  const floorplanData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);

  const findNewestTransaction = (data: trackingTransType[]) => {
    if (data.length === 0) return null;

    return data.reduce((newest, current) => {
      return new Date(current.transTime) > new Date(newest.transTime) ? current : newest;
    });
  };

  const newestTransaction = findNewestTransaction(trackingTransData);

  useEffect(() => {
    dispatch(fetchTrackingTrans());
    dispatch(fetchBleReaders());
    dispatch(fetchMaskedAreas());
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

  const getFloorName = (floorId: string) => {
    const floor = floorplanData.find((fl: MaskedAreaType) => fl.id === floorId);
    return floor ? floor.name : 'Unknown Floor';
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
                      'Trans Time',
                      'Reader Name',
                      'Card ID',
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
                    .map((trackingTrans: trackingTransType, index) => (
                      <TableRow key={trackingTrans.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {isNew ? 1 : index + 1} {/* Show "1" if isNew is true */}
                        </TableCell>
                        <TableCell>{trackingTrans.id}</TableCell>
                        <TableCell>{formatTime(trackingTrans.transTime)}</TableCell>
                        <TableCell>{getReaderName(trackingTrans.readerId)}</TableCell>
                        <TableCell>{trackingTrans.cardId}</TableCell>
                        <TableCell>{getFloorName(trackingTrans.floorplanId)}</TableCell>
                        <TableCell>
                          {formatCoords(trackingTrans.coordinateX, trackingTrans.coordinateY)}
                        </TableCell>
                        <TableCell>{trackingTrans.alarmStatus}</TableCell>
                        <TableCell>{trackingTrans.battery}</TableCell>
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
