import React from 'react';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { Box, Fab, TextField, InputAdornment } from '@mui/material';
import { IconMenu2, IconSearch } from '@tabler/icons-react';
import { useDebounce } from 'use-debounce';
import { UpdateAssignmentFilter } from 'src/store/apps/crud/patrolRoute';

type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const PatrolAssignmentSearch = ({ onClick }: Props) => {
  const searchValue = useSelector(
    (state: RootState) => state.PatrolRouteReducer.patrolAssignFilter.searchValue
  );
  const dispatch = useDispatch();
  const [value, setValue] = React.useState(searchValue);
  const [debouncedValue] = useDebounce(value, 500); // 500ms delay

  React.useEffect(() => {
    dispatch(UpdateAssignmentFilter({ searchValue: debouncedValue }));
  }, [debouncedValue, dispatch]);

  return (
    <Box display="flex" sx={{ p: 2 }} flexDirection="column">
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
        value={value}
        placeholder="Search by Name, Card Number, ID"
        variant="outlined"
        onChange={(e) => setValue(e.target.value)}
      />
    </Box>
  );
};

export default PatrolAssignmentSearch;
