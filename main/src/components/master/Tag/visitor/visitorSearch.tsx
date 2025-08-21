import React, { useEffect, useState } from 'react';
import { Box, TextField, Fab, InputAdornment, IconButton } from '@mui/material';

import { IconMenu2, IconSearch, IconX } from '@tabler/icons-react';
import { RootState, useDispatch } from 'src/store/Store';
import { useSelector } from 'react-redux';
import { UpdateFilter, fetchTrxVisitorDT } from 'src/store/apps/crud/trxVisitor';
type Props = { onClick: (event: React.MouseEvent<HTMLElement>) => void };

const VisitorSearch = ({ onClick }: Props) => {
  const dispatch = useDispatch();

  const filter = useSelector((state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter);
  const [query, setQuery] = useState(filter.SearchValue ?? '');
  useEffect(() => {
    setQuery(filter.SearchValue ?? '');
  }, [filter.SearchValue]);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = {
        ...filter,
        SearchValue: query ?? '',
        Start: 0,
      };

      dispatch(UpdateFilter({ SearchValue: next.SearchValue, Start: 0 }));
      dispatch(fetchTrxVisitorDT(next)); // use next, not stale selector
    }, 300);

    return () => clearTimeout(t);
  }, [query]); // dispatch is stable

  return (
    <Box display="flex" flexDirection="column" gap={1} p={2}>
      {/* Search Bar */}
      <Fab
        onClick={onClick}
        color="primary"
        size="small"
        sx={{ mr: 1, flexShrink: '0', display: { xs: 'block', lineHeight: '10px', lg: 'none' } }}
      >
        <IconMenu2 width="16" />
      </Fab>
      <TextField
        id="visitor-search"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ gap: 0.5 }}>
              {query && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setQuery('');
                    dispatch(UpdateFilter({ SearchValue: '', Start: 0 }));
                    dispatch(fetchTrxVisitorDT({ ...filter, SearchValue: '', Start: 0 }));
                  }}
                >
                  <IconX size={16} />
                </IconButton>
              )}
              <IconSearch size={16} />
            </InputAdornment>
          ),
        }}
        fullWidth
        size="small"
        value={query}
        placeholder="Search by Name, Card Number, ID"
        variant="outlined"
        onChange={(e) => setQuery(e.target.value)}
      />
    </Box>
  );
};

export default VisitorSearch;
