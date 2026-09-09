import React from 'react';
import { Grid2 as Grid, Card, Typography, Box, Stack } from '@mui/material';
import {
  IconUsers,
  IconUserCheck,
  IconIdBadge,
  IconMapPin,
  IconClock,
  IconTrendingUp,
} from '@tabler/icons-react';
import { VisitorSessionResponseType, VisitorSessionType } from 'src/store/apps/crud/visitorSession';
import { toLocalDate } from 'src/utils/time';

interface TrackingReportTopCardProps {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
}

const TrackingReportTopCard: React.FC<TrackingReportTopCardProps> = ({ data, isLoading }) => {
  let totalPeople = 0;
  let activeVisitors = 0;
  let activeMembers = 0;
  let activeAreasCount = 0;
  let totalMinutes = 0;

  const sessionList: VisitorSessionType[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.collection?.data)
    ? (data as any).collection.data
    : Array.isArray((data as any)?.data)
    ? (data as any).data
    : [];

  if (sessionList.length > 0) {
    // Handling VisitorSessionType[] from useVisitorSession()
    const uniquePersons = new Set<string>();
    const uniqueVisitorIds = new Set<string>();
    const uniqueMemberIds = new Set<string>();
    const uniqueAreas = new Set<string>();

    sessionList.forEach((session) => {
      const pType = session.personType?.toLowerCase();
      if (pType === 'security') return;

      const pId = session.personId || session.visitorId || session.memberId || session.personName;
      if (pId) uniquePersons.add(pId);

      if (pType === 'visitor') {
        if (pId) uniqueVisitorIds.add(pId);
      } else if (pType === 'member') {
        if (pId) uniqueMemberIds.add(pId);
      }

      if (session.areaName) uniqueAreas.add(session.areaName);
      if (session.durationInMinutes) totalMinutes += session.durationInMinutes;
    });

    totalPeople = uniquePersons.size || sessionList.length;
    activeVisitors = uniqueVisitorIds.size;
    activeMembers = uniqueMemberIds.size;
    activeAreasCount = uniqueAreas.size;
  } else if ((data as VisitorSessionResponseType)?.persons) {
    // Handling VisitorSessionResponseType from useNewVisitorSession()
    const persons = (data as VisitorSessionResponseType).persons || [];
    const summary = (data as VisitorSessionResponseType).summary;

    totalPeople = persons.length;
    activeVisitors = persons.filter((p) => p.personType?.toLowerCase() === 'visitor').length;
    activeMembers = persons.filter((p) => p.personType?.toLowerCase() === 'member').length;

    const uniqueAreasSet = new Set<string>();
    persons.forEach((p) => {
      if (p.currentArea) uniqueAreasSet.add(p.currentArea);
      if (p.areasVisited) {
        p.areasVisited.forEach((a) => uniqueAreasSet.add(a));
      }
    });
    activeAreasCount = uniqueAreasSet.size;
    totalMinutes = summary?.totalDurationMinutes ?? 0;
  }

  // Calculate Peak Time by grouping enter times by hour
  const hourlyBuckets = new Array(24).fill(0);
  
  if (sessionList.length > 0) {
    sessionList.forEach((s) => {
      if (s.enterTime) {
        const hour = toLocalDate(s.enterTime)?.getHours();
        if (hour !== undefined && hour >= 0 && hour < 24) {
          hourlyBuckets[hour]++;
        }
      }
    });
  } else if ((data as VisitorSessionResponseType)?.persons) {
    const persons = (data as VisitorSessionResponseType).persons || [];
    persons.forEach((p) => {
      p.sessions?.forEach((s) => {
        if (s.enterTime) {
          const hour = toLocalDate(s.enterTime)?.getHours();
          if (hour !== undefined && hour >= 0 && hour < 24) {
            hourlyBuckets[hour]++;
          }
        }
      });
    });
  }

  let peakHour = 9; // Default to 09:00 if no data
  let maxCount = 0;
  hourlyBuckets.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  });

  const peakTimeStr = `${String(peakHour).padStart(2, '0')}:00`;

  const avgMinutes = totalPeople > 0 ? Math.round(totalMinutes / totalPeople) : 0;
  const avgHoursFormatted = String(Math.floor(avgMinutes / 60)).padStart(2, '0');
  const avgMinsFormatted = String(avgMinutes % 60).padStart(2, '0');
  const avgDurationStr = `${avgHoursFormatted}:${avgMinsFormatted}`;

  const cards = [
    {
      title: 'Total People (Now)',
      value: totalPeople,
      subtitle: 'Currently in premises',
      icon: IconUsers,
      iconBg: '#E8F2FE',
      iconColor: '#1877F2',
    },
    {
      title: 'Active Visitors',
      value: activeVisitors,
      subtitle: 'Visitors on site',
      icon: IconUserCheck,
      iconBg: '#E6F4EA',
      iconColor: '#137333',
    },
    {
      title: 'Active Members',
      value: activeMembers,
      subtitle: 'Members on site',
      icon: IconIdBadge,
      iconBg: '#FEF3D6',
      iconColor: '#B06000',
    },
    {
      title: 'Active Areas',
      value: activeAreasCount,
      subtitle: 'Areas with presence',
      icon: IconMapPin,
      iconBg: '#F3E8FD',
      iconColor: '#8E24AA',
    },
    {
      title: 'Avg. Duration',
      value: avgDurationStr,
      subtitle: 'Average time (hh:mm)',
      icon: IconClock,
      iconBg: '#E8F2FE',
      iconColor: '#1877F2',
    },
    {
      title: 'Peak Time',
      value: peakTimeStr,
      subtitle: maxCount > 0 ? `${maxCount} check-ins` : `Today's peak time`,
      icon: IconTrendingUp,
      iconBg: '#E6F4EA',
      iconColor: '#137333',
    },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                p: 2,
                height: '100%',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" fontWeight={500} mb={1}>
                {card.title}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} color={card.iconColor} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {isLoading ? '...' : card.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {card.subtitle}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default TrackingReportTopCard;
