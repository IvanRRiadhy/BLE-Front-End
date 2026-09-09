import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useBlacklistLog } from 'src/hooks/useDashboard';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { BASE_URL } from 'src/utils/axios';

interface BlacklistItem {
  id: string;
  name: string;
  image: string;
}

const NewBlacklist: React.FC = () => {
  const { data = [] } = useBlacklistLog();
  const [searchQuery, setSearchQuery] = useState('');

  const blacklist = useMemo<BlacklistItem[]>(() => {
    return data.map((x: any) => ({
      id: x.id,
      name: x.name,
      image: x.faceImage ? `${BASE_URL}${x.faceImage}` : '',
    }));
  }, [data]);

  const filteredBlacklist = useMemo(() => {
    if (!searchQuery.trim()) return blacklist;
    const q = searchQuery.toLowerCase().trim();
    return blacklist.filter((item) => item.name.toLowerCase().includes(q));
  }, [blacklist, searchQuery]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Title centered */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pb: 0.75 }}>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          Blacklisted
        </Typography>
      </Box>

      {/* Searchbar below title, right-side only */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 0.5, pb: 1 }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 0.5 }}>
                <IconSearch size={14} color="#94A3B8" />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                  <IconX size={12} />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: {
              borderRadius: '20px',
              fontSize: '12px',
              height: '30px',
              width: { xs: '100px', sm: '115px', md: '130px' },
              bgcolor: 'action.hover',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'divider' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              '& .MuiInputBase-input': { py: 0.5, px: 0.5 },
            },
          }}
        />
      </Box>

      {/* LIST */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
        }}
      >
        {filteredBlacklist.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
              {searchQuery ? `No results for "${searchQuery}"` : 'No blacklisted members'}
            </Typography>
          </Box>
        ) : (
          filteredBlacklist.map((item) => (
            <Stack
              key={item.id}
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                p: 1,
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                borderBottom: '1px solid',
                borderColor: 'divider',
                width: '100%',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            >
              {/* Avatar */}
              <Avatar src={item.image} alt="user" sx={{ width: 56, height: 56 }} />

              {/* Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SmartScrollingText text={item.name} fontSize={16} fontWeight={600} color="textPrimary" />
              </Box>
            </Stack>
          ))
        )}
      </Box>
    </Box>
  );
};

export default NewBlacklist;
