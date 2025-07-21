import {
  Box,
  Button,
  Checkbox,
  Drawer,
  Grid2 as Grid,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
} from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { UpdateFilter } from 'src/store/apps/crud/bleReader';
import { fetchBrands } from 'src/store/apps/crud/brand';
import { RootState, useDispatch, useSelector } from 'src/store/Store';

type DummyFilter = {
  Draw: number;
  Start: number;
  Length: number;
  SortColumn: string;
  SortDir: 'asc' | 'desc';
  searchValue: string;
  filters: {
    BrandId: string[];
    EngineReaderId: string[];
  };
};

const BleReaderFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const brandList = useSelector((state: RootState) => state.brandReducer.brands);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);
  const [appliedFilter, setAppliedFilter] = useState(bleReaderFilter.filters);
  const [testing, setTesting] = useState<DummyFilter>({
    Draw: 1,
    Start: 0,
    Length: 10,
    SortColumn: 'name',
    SortDir: 'asc',
    searchValue: '',
    filters: {
      BrandId: [],
      EngineReaderId: [],
    },
  });
  useEffect(() => {
    dispatch(fetchBrands());
    // setAppliedFilter(bleReaderFilter.filters);
  }, [dispatch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: string }>,
  ) => {
    // console.log('e.target.name', e.target.name);
    const { name, value } = e.target;
    if (name) {
      setAppliedFilter({ ...appliedFilter, [name]: value });
      //   dispatch(UpdateFilter({ filters: { ...bleReaderFilter.filters, BrandId: value } }));
    }
  };

  const handleApplyFilter = () => {
    dispatch(UpdateFilter({ filters: appliedFilter }));
  };

  return (
    <>
      <Button
        onClick={handleClickOpen}
        size="medium"
        variant="outlined"
        startIcon={<IconAdjustmentsHorizontal />}
        color="info"
        sx={{ height: 36, mx: 2 }}
      >
        <Typography variant="caption" fontSize={'0.7rem'}>
          Filter
        </Typography>
      </Button>
      {/* Right-side sliding Drawer (non-modal) */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            padding: 3,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ my: 4, borderBottom: 5, borderColor: 'primary.main' }}
        >
          BLE Reader Filter
        </Typography>

        <Grid container spacing={3}>
          <Grid size={12}>
            <CustomFormLabel htmlFor="brandName">
              <Typography variant="caption">Brand Name :</Typography>
            </CustomFormLabel>
            <CustomSelect
              name="BrandId"
              value={appliedFilter.BrandId || ''}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            >
              {brandList.map((brand: any) => (
                <MenuItem key={brand.id} value={brand.id}>
                  {brand.name}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
          <Grid size={12}>
            <CustomFormLabel htmlFor="brandName">
              <Typography variant="caption">Multi-Brand Name :</Typography>
            </CustomFormLabel>
            <CustomSelect
              name="BrandId"
              value={testing.filters.BrandId}
              onChange={(e: any) => {
                const value = e.target.value as string[];
                if (value.includes('all')) {
                  setTesting((prev) => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      BrandId:
                        testing.filters.BrandId?.length === brandList.length
                          ? []
                          : brandList.map((brand: any) => brand.id),
                    },
                  }));
                  return;
                }
                setTesting((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    BrandId: value,
                  },
                }));
              }}
              fullWidth
              variant="outlined"
              multiple
              renderValue={(selected: string[]) => {
                if (selected.length === 0) return 'Select Brands';
                if (selected.length === brandList.length) return 'All Brands';
                return selected.map((id: string) => {
                  const brand = brandList.find((b: any) => b.id === id);
                  return brand ? brand.name : '';
                }).join(', ');
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200, // Set the maximum height of the dropdown menu
                    width: 100, // Adjust the width of the dropdown menu
                  },
                },
              }}
            >
              <MenuItem value="all">
                <ListItemIcon>
                  <Checkbox
                    checked={testing.filters.BrandId?.length === brandList.length}
                    indeterminate={
                      testing.filters.BrandId.length > 0 &&
                      testing.filters.BrandId.length < brandList.length
                    }
                  />
                </ListItemIcon>
                <ListItemText primary="All Brands" />
              </MenuItem>
              {brandList.map((brand: any) => (
                <MenuItem key={brand.id} value={brand.id}>
                  <ListItemIcon>
                    <Checkbox checked={testing.filters.BrandId?.includes(brand.id)} />
                  </ListItemIcon>
                  {brand.name}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
          <Grid size={12}>
            <CustomFormLabel htmlFor="engineReader">
              <Typography variant="caption">Engine Reader :</Typography>
            </CustomFormLabel>
            <CustomTextField
              InputProps={{
                sx: {
                  fontSize: '0.7rem',
                },
              }}
              id="engineReader"
              fullWidth
              variant="outlined"
              disabled
            />
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              handleApplyFilter();
              handleClose();
            }}
          >
            Apply Filter
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default BleReaderFilter;
