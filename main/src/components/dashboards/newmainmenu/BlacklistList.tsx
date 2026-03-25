import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Avatar, Stack, Tooltip } from '@mui/material';
import { useBlacklistLog } from 'src/hooks/useDashboard';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { BASE_URL } from 'src/utils/axios';

interface BlacklistItem {
  id: string;
  name: string;
  image: string;
}

const NewBlacklist: React.FC = () => {
  const { data = [], isLoading, isError } = useBlacklistLog();
  const blacklist = useMemo<BlacklistItem[]>(() => {
    return data.map((x: any) => ({
      id: x.id,
      name: x.name,
      image: x.faceImage ? `${BASE_URL}${x.faceImage}` : '',
    }));
  }, [data]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh', // ✅ ikut Grid
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* TITLE (fixed height) */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pb: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: '#045498',
          }}
        >
          Blacklisted
        </Typography>
      </Box>

      {/* LIST (flexible height) */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
        }}
      >
        {blacklist.map((item, index: number) => (
          <Stack
            key={item.id}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              p: 1,
              backgroundColor: index % 2 !== 0 ? 'grey.50' : 'white',
              borderBottom: '1px solid #e0e0e0',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Avatar */}
            <Avatar src={item.image} alt="user" sx={{ width: 56, height: 56 }} />

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* <Tooltip title={item.name}>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#045498',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.name}
                </Typography>
              </Tooltip> */}
              <SmartScrollingText text={item.name} fontSize={16} fontWeight={600} color="#045498" />
            </Box>
          </Stack>
        ))}
      </Box>
    </Box>
  );
};

export default NewBlacklist;
