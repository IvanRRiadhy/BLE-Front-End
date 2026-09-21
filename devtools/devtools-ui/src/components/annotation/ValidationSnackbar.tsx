import React from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import { ValidationError } from '../../types/annotation';

interface ValidationSnackbarProps {
  toast: { text: string; severity: 'success' | 'error' | 'info' | 'warning' } | null;
  validationErrors: ValidationError[];
  onCloseToast: () => void;
  onClearValidationErrors: () => void;
}

export const ValidationSnackbar: React.FC<ValidationSnackbarProps> = ({
  toast,
  validationErrors,
  onCloseToast,
  onClearValidationErrors,
}) => {
  return (
    <>
      {/* Toast Alert */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={onCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            onClose={onCloseToast}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          >
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>

      {/* Validation Errors Sticky Banner */}
      {validationErrors.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1400,
            maxWidth: 600,
            width: '90%',
          }}
        >
          <Alert
            severity="error"
            variant="filled"
            onClose={onClearValidationErrors}
            sx={{
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              backgroundColor: '#7f1d1d',
              border: '1px solid #ef4444',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Polygon Validation Failed ({validationErrors.length} issues):
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.82rem' }}>
              {validationErrors.slice(0, 4).map((err, idx) => (
                <li key={idx}>{err.message}</li>
              ))}
              {validationErrors.length > 4 && (
                <li>...and {validationErrors.length - 4} more error(s)</li>
              )}
            </Box>
          </Alert>
        </Box>
      )}
    </>
  );
};
