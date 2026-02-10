import React from 'react';
import { Autocomplete, TextField, CircularProgress, SxProps, Theme } from '@mui/material';

type SingleSelectProps<T> = {
  multiple?: false;
  value: T | null;
  onChange: (value: T | null) => void;
};

type MultiSelectProps<T> = {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

export type CustomAutocompleteProps<T> = {
  label: string;
  options: T[];
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue: (option: T, value: T) => boolean;

  required?: boolean;
  error?: boolean;
  helperText?: string;

  loading?: boolean;
  renderOption?: any;
  sx?: SxProps<Theme>;
} & (SingleSelectProps<T> | MultiSelectProps<T>);

export default function CustomAutocomplete<T>(props: CustomAutocompleteProps<T>) {
  const {
    label,
    options,
    getOptionLabel,
    isOptionEqualToValue,
    required = false,
    error,
    helperText,
    loading = false,
    renderOption,
    sx,
  } = props;
  return (
    <Autocomplete
      multiple={props.multiple}
      options={options}
      value={props.value as any}
      loading={loading} // <-- pass to Autocomplete
      onChange={(_, newVal) => props.onChange(newVal as any)}
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
            boxShadow: '0px 4px 12px rgba(0,0,0,0.12), 0px 0px 4px rgba(0,0,0,0.05)',
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
