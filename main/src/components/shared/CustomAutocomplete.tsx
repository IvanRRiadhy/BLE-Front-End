import React from 'react';
import { Autocomplete, TextField, CircularProgress, SxProps, Theme } from '@mui/material';

export interface CustomAutocompleteProps<T> {
  label: string;
  options: T[];
  value: T | null;
  onChange: (newValue: T | null) => void;
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue: (option: T, value: T) => boolean;

  required?: boolean;
  error?: boolean;
  helperText?: string;

  loading?: boolean;          // <-- ADD THIS
  renderOption?: any;         // <-- support custom option layout
  sx?: SxProps<Theme>;
}

export default function CustomAutocomplete<T>({
  label,
  options,
  value,
  onChange,
  getOptionLabel,
  isOptionEqualToValue,
  required = false,
  error,
  helperText,
  loading = false,            // <-- default value
  renderOption,
  sx,
}: CustomAutocompleteProps<T>) {
  return (
    <Autocomplete
      options={options}
      value={value}
      loading={loading}       // <-- pass to Autocomplete
      onChange={(_, newVal) => onChange(newVal)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      clearOnEscape
      fullWidth
      sx={sx}
      popupIcon={loading ? <CircularProgress size={18} /> : undefined}
      loadingText="Loading..."
      componentsProps={{
        paper: {
          elevation: 6,
          sx: {
            borderRadius: 2,
            mt: 1,
            py: 1,
            backgroundColor: '#fff',
            boxShadow:
              '0px 4px 12px rgba(0,0,0,0.12), 0px 0px 4px rgba(0,0,0,0.05)',
            '& .MuiAutocomplete-option': {
              px: 2,
              py: 1,
              fontSize: '0.9rem',
              borderBottom: '1px solid #f0f0f0',
            },
            '& .MuiAutocomplete-option:last-child': {
              borderBottom: 'none',
            },
          },
        },
      }}
      ListboxProps={{
        style: {
          maxHeight: 220,
          overflowY: 'auto',
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
