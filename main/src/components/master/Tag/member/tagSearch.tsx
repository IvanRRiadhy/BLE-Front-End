import React from 'react';
import { useSelector, useDispatch, AppState } from 'src/store/Store';
import { Box, Fab, TextField, InputAdornment } from '@mui/material';

import { SearchMember } from 'src/store/apps/crud/member';
import { IconMenu2, IconSearch } from '@tabler/icons-react';

type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const TagSearch = ({ onClick }: Props) => {
  const searchTerm = useSelector((state: AppState) => state.memberReducer.memberSearch);
  const dispatch = useDispatch();
  return (
    <Box display="flex" sx={{ p: 2 }} flexDirection="column">
      <Fab
        onClick={onClick}
        color="primary"
        size="small"
        sx={{ mr: 1, flexShrink: '0', display: { xs: 'block', lineHeight: '10px', lg: 'none' } }}
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
        value={searchTerm}
        placeholder="Search by Name, Card Number, ID"
        variant="outlined"
        onChange={(e) => dispatch(SearchMember(e.target.value))}
      />
    </Box>
  );
};

export default TagSearch;
