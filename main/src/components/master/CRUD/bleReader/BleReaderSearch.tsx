import { Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react';
import { useState, useCallback, useEffect } from 'react';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { UpdateFilter } from 'src/store/apps/crud/bleReader';

const BleReaderSearch = () => {
  const dispatch: AppDispatch = useDispatch();
  const bleReaderFilter = useSelector(
    (state: RootState) => state.bleReaderReducer.bleReaderFilter,
  );

  // Initialize from Redux so it doesn't clear an external filter on mount
  const [searchValue, setSearchValue] = useState(bleReaderFilter.SearchValue || '');

  // Keep internal state synced if Redux changes externally (like on mount from location state)
  useEffect(() => {
    setSearchValue(bleReaderFilter.SearchValue || '');
  }, [bleReaderFilter.SearchValue]);

  useEffect(() => {
    // Only dispatch if the local searchValue differs from Redux
    if (searchValue.trim() !== (bleReaderFilter.SearchValue || '')) {
      const delayDebounce = setTimeout(() => {
        dispatch(UpdateFilter({ ...bleReaderFilter, SearchValue: searchValue.trim() }));
      }, 1000);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchValue, dispatch, bleReaderFilter.SearchValue]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      dispatch(UpdateFilter({ ...bleReaderFilter, SearchValue: searchValue.trim() }));
    }
  };

  const handleClearSearch = () => {
    setSearchValue('');
    dispatch(UpdateFilter({ ...bleReaderFilter, SearchValue: '' }));
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <TextField
        placeholder="Search..."
        variant="outlined"
        size="small"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={handleSearchKeyPress}
        sx={{ width: 220 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconSearch size={18} />
            </InputAdornment>
          ),
          endAdornment: searchValue.length > 0 && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClearSearch}>
                <IconX size={16} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default BleReaderSearch;