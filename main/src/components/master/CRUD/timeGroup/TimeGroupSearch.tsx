import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { Box, Fab, TextField, InputAdornment, Button } from '@mui/material';
import { AddNewTimeGroup, UpdateFilter } from 'src/store/apps/crud/timeGroup';
import { IconMenu2, IconSearch } from '@tabler/icons-react';
import { defaultTimeGroupForm } from 'src/store/apps/defaultForm';

type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const TimeGroupSearch = ({ onClick }: Props) => {
  const searchValue = useSelector(
    (state: RootState) => state.TimeGroupReducer.timeGroupFilter.SearchValue,
  );
  const dispatch = useDispatch();

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
      <Button variant="contained" color="secondary" onClick={handleAdd}>
        + Add TimeGroup
      </Button>
    </Box>
  );
};

export default TimeGroupSearch;
