import React from 'react';
import { Autocomplete, TextField, CircularProgress, SxProps, Theme, AutocompleteRenderGetTagProps } from '@mui/material';

type SingleSelectProps<T> = {
  multiple?: false;
  value: T | null;
  onChange: (value: T | null) => void;
};

type MultiSelectProps<T> = {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
  renderTags?: (value: T[], getTagProps: AutocompleteRenderGetTagProps) => React.ReactNode;
};

export type CustomAutocompleteProps<T> = {
  label?: string;
  placeholder?: string;
  options: T[];
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue: (option: T, value: T) => boolean;

  required?: boolean;
  error?: boolean;
  helperText?: string;

  loading?: boolean;
  disabled?: boolean;
  renderOption?: any;
  sx?: SxProps<Theme>;
  filterSelectedOptions?: boolean;
} & (SingleSelectProps<T> | MultiSelectProps<T>);

export default function CustomAutocomplete<T>(props: CustomAutocompleteProps<T>) {
  const {
    label,
    placeholder,
    options,
    getOptionLabel,
    isOptionEqualToValue,
    required = false,
    error,
    helperText,
    loading = false,
    disabled = false,
    renderOption,
    sx,
    filterSelectedOptions,
  } = props;
  return (
    <Autocomplete
      multiple={props.multiple}
      options={options}
      value={props.value as any}
      loading={loading} // <-- pass to Autocomplete
      disabled={disabled}
      onChange={(_, newVal) => props.onChange(newVal as any)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      renderTags={props.multiple ? props.renderTags : undefined}
      filterSelectedOptions={filterSelectedOptions}
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
            backgroundColor: 'background.paper',
            border: '1px solid #f0f0f0',
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
          placeholder={placeholder}
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
