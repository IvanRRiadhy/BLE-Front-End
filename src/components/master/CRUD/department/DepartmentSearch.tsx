import { Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react';
import { useState, useCallback, useEffect } from 'react';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { UpdateFilter } from 'src/store/apps/crud/department';

const DepartmentSearch = () => {
  const dispatch: AppDispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');
  const departmentFilter = useSelector(
    (state: RootState) => state.departmentReducer.departmentFilter,
  );

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      dispatch(UpdateFilter({ ...departmentFilter, SearchValue: searchValue.trim() }));
    }, 1000);
    return () => clearTimeout(delayDebounce);
  }, [searchValue, dispatch, departmentFilter]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      dispatch(UpdateFilter({ ...departmentFilter, SearchValue: searchValue.trim() }));
    }
  };

  const handleClearSearch = () => {
    setSearchValue('');
    dispatch(UpdateFilter({ ...departmentFilter, SearchValue: '' }));
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

export default DepartmentSearch;