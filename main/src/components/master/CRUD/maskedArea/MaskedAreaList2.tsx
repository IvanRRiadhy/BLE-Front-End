import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid2 as Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { useTranslation } from 'react-i18next';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchFloorplan, SelectFloorplan } from 'src/store/apps/crud/floorplan';
import { IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

const MaskedAreaList2 = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  useEffect(() => {
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloorplan());
  }, [dispatch]);

  const handleOnClick = (id: string) => {
    // console.log('id: ', id);
    dispatch(SelectFloorplan(id));
    navigate('/master/floorplanmaskedarea/edit');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          <BlankCard>
            <TableContainer>
              <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Empty Column */}
                    <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>
                      <Typography variant="h6">Floorplans</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="h6">Total Area</Typography>
                    </TableCell>
                    {/* Right Sticky Empty Column */}
                    <TableCell
                      sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 2 }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {floorplanData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((floorplan: any, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {floorplan.name}
                        </TableCell>
                        <TableCell>{floorplan.maskedAreas.length}</TableCell>

                        <TableCell
                          sx={{
                            position: 'sticky',
                            right: 0,
                            background: 'white',
                            zIndex: 2,
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                          }}
                        >
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOnClick(floorplan.id)}
                          >
                            <IconEdit size={20} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={floorplanData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default MaskedAreaList2;
