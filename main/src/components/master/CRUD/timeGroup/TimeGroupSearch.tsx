import { useSelector, useDispatch, RootState, AppDispatch } from 'src/store/Store';
import { Box, Fab, TextField, InputAdornment, Button } from '@mui/material';
import { AddNewTimeGroup, UpdateFilter } from 'src/store/apps/crud/timeGroup';
import { IconMenu2, IconSearch } from '@tabler/icons-react';
import { defaultTimeGroupForm } from 'src/store/apps/defaultForm';
import { useEffect, useState } from 'react';

type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const TimeGroupSearch = ({ onClick }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');
  const timeGroupFilter = useSelector(
    (state: RootState) => state.TimeGroupReducer.timeGroupFilter,
  );

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      dispatch(UpdateFilter({ ...timeGroupFilter,Start: 0, SearchValue: searchValue.trim() }));
    }, 1000);
    return () => clearTimeout(delayDebounce);
  }, [searchValue, dispatch, timeGroupFilter]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      dispatch(UpdateFilter({ ...timeGroupFilter,Start: 0, SearchValue: searchValue.trim() }));
    }
  };

  const handleClearSearch = () => {
    setSearchValue('');
    dispatch(UpdateFilter({ ...timeGroupFilter,Start: 0, SearchValue: '' }));
  };

  const handleAdd = () => {
    dispatch(AddNewTimeGroup(defaultTimeGroupForm));
  };

  return (
    <Box display="flex" sx={{ p: 2, gap: 2 }} flexDirection="column">
      <Fab
        onClick={onClick}
        color="primary"
        size="small"
        sx={{
          mr: 1,
          flexShrink: '0',
          display: { xs: 'block', lineHeight: '10px', lg: 'none' },
        }}
      >
        <IconMenu2 width="16" />
      </Fab>
      <TextField
        id="outlined-basic"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconSearch size={'16'} />
            </InputAdornment>
          ),
        }}
        fullWidth
        size="small"
        value={searchValue}
        placeholder="Search by Name, Card Number, ID"
        variant="outlined"
        onChange={(e) => dispatch(UpdateFilter({ SearchValue: e.target.value }))}
      />
      <Button variant="contained" color="primary" onClick={handleAdd}>
        + Add TimeGroup
      </Button>
    </Box>
  );
};

export default TimeGroupSearch;
