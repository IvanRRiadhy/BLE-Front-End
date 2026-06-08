import { Box, Button, Drawer, Grid2 as Grid, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';

const AccessCCTVFilter = () => {
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
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
        <Typography variant="h4" gutterBottom sx={{ my: 4, borderBottom: 5, borderColor: 'primary.main'}}>
          Access CCTV Filter
        </Typography>

        <Grid container spacing={3}>
          <Grid size={12}>
            <CustomFormLabel htmlFor="integrationType">
              <Typography variant="caption">Integration Type :</Typography>
              <CustomTextField
                InputProps={{
                  sx: {
                    fontSize: '0.7rem',
                  },
                }}
                id="integrationType"
                fullWidth
                variant="outlined"
              />
            </CustomFormLabel>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button variant="contained" fullWidth onClick={handleClose}>
            Apply Filter
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default AccessCCTVFilter;
