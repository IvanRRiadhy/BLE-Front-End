import { Box, Typography } from '@mui/material';

const ThankYouPage = () => {
  return (
    <Box sx={{ maxWidth: '600px', mx: 'auto', p: 5, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Thank you for verifying your Visit Form.
      </Typography>
      <Typography variant="body1">
        We hope you a great visit!
      </Typography>
    </Box>
  );
};

export default ThankYouPage;
