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
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
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
            color: 'primary.main',
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
              <SmartScrollingText text={item.name} fontSize={16} fontWeight={600} color="textPrimary" />
            </Box>
          </Stack>
        ))}
      </Box>
    </Box>
  );
};

export default NewBlacklist;
