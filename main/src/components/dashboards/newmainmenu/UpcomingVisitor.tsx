import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { useUpcomingVisitor } from 'src/hooks/useDashboard';
import { BASE_URL } from 'src/utils/axios';
import SmartScrollingText from 'src/utils/SmartScrollingText';
// import { getUpcomingVisitor } from "../services/apiService";
// import dumpy from "../assets/ambatukam.jpeg";

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: '',
  sortDir: 'desc',
  searchValue: '',
  timeRange: 'daily',
};

interface UpcomingVisitorItem {
  id: string;
  status: string;
  name: string;
  image: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
}

const statusColorMap: Record<string, string> = {
  denied: 'error.dark',
  checkout: 'primary.dark',
  checkin: 'success.dark',
};

const UpcomingVisitor: React.FC = () => {
  const { data = [], isLoading, isError } = useUpcomingVisitor(defaultFilter);
  function resolvePerson(x: any) {
    // console.log("Resolving Person:", x);
    if (x.visitor) {
      // console.log("Is Visitor", x.visitor)
      return {
        type: 'Visitor',
        name: x.visitor.name,
        image: x.visitor.faceImage,
      };
    }

    if (x.member) {
      // console.log("Is Member", x.member)
      return {
        type: 'Member',
        name: x.member.name,
        image: x.member.faceImage,
      };
    }

    return {
      type: 'Unknown',
      name: x.visitorCode ? `${x.visitorCode} (Visit Code)` : '-',
      image: '',
    };
  }
  const upcomingVisitor = useMemo<UpcomingVisitorItem[]>(() => {
    console.log('Upcoming Visitor Data:', data);
    return data.map((x: any) => ({
      id: x.id,
      status: x.status,
      name: resolvePerson(x).name,
      image: resolvePerson(x).image,
      checkInAt: x.checkedInAt,
      checkOutAt: x.checkedOutAt,
    }));
  }, [data]);

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
      {/* Title */}
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
          Visitor Today
        </Typography>
      </Box>

      {/* List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
        }}
      >
        {upcomingVisitor.length === 0 ? (
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
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              There are no visitors today
            </Typography>
          </Box>
        ) : (
          upcomingVisitor.map((item, index: number) => (
            <Stack
              key={`${index}-${item.id}`}
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
              <Avatar
                src={item.image ? `${BASE_URL}${item.image}` : ''}
                alt="visitor"
                sx={{ width: 56, height: 56 }}
              />

              {/* Visitor info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SmartScrollingText
                  text={item.name}
                  fontSize={16}
                  fontWeight={600}
                  color="textPrimary"
                />

                <SmartScrollingText
                  text={item.checkInAt ? new Date(item.checkInAt).toLocaleString() : '-'}
                  fontSize={12}
                  color="textSecondary"
                />
              </Box>

              {/* Status */}
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: statusColorMap[item.status.toLowerCase()] ?? 'text.primary',
                }}
              >
                {item.status}
              </Typography>
            </Stack>
          ))
        )}
      </Box>
    </Box>
  );
};

export default UpcomingVisitor;
