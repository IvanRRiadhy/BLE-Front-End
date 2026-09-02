import {
  Box,
  Typography,
  Grid2 as Grid,
  Avatar,
  Chip,
  Stack,
  lighten,
  darken,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { RootState } from 'src/store/Store';
import { BASE_URL } from 'src/utils/axios';

const MEMBER_COLOR = '#1976d2'; // blue
const VISITOR_COLOR = '#f50057'; // red
const COLORS = {
  visitor: '#f50057', // bright red
  member: '#1976d2', // bright blue
  security: '#00c853', // bright green
  blacklist: '#8B0000', // dark red
  black: '#000000',
  white: '#ffffff',
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <Box sx={{ mb: 0.75, minWidth: 0 }}>
    <Typography
      variant="caption"
      textAlign="left"
      sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', wordBreak: 'break-word' }}
    >
      {label}
    </Typography>
    <Typography variant="body2" textAlign="left" sx={{ color: '#ffffff', fontWeight: 500, wordBreak: 'break-word' }}>
      {value || '-'}
    </Typography>
  </Box>
);
const chipSx = {
  bgcolor: '#8B0000',
  color: '#fff',
  letterSpacing: '0.5px',
  height: 22,
  fontWeight: 700,
  fontSize: 11,
};

type NewestTrackProps = {
  followedOnly?: boolean;
};

const NewestTrack = ({ followedOnly = false }: NewestTrackProps) => {
  const beaconsByTopic = useSelector((state: RootState) => state.BeaconReducer.allBeacons);
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  const followingPersons = useSelector((state: RootState) => state.layoutReducer.followingPersons ?? []);
  const { data: visitorsData = [] } = useAllVisitor();
  const { data: membersData = [] } = useAllMembers();
  const { data: securityData = []} = useAllSecuritys();

  const visitorMap = new Map(visitorsData.map((v) => [v.id, v]));

  const memberMap = new Map(membersData.map((m) => [m.id, m]));

  const securityMap = new Map(securityData.map((s) => [s.id, s]));

  const getDisplayName = (beacon: any) => {
    const visitor = beacon.visitorCardId
      ? visitorMap.get(beacon.visitorCardId.toLowerCase())
      : null;

    const member = beacon.memberCardId ? memberMap.get(beacon.memberCardId.toLowerCase()) : null;

    const security = beacon.securityCardId
      ? securityMap.get(beacon.securityCardId.toLowerCase())
      : null;

    return (
      visitor?.name ||
      member?.name ||
      security?.name ||
      beacon.visitorCardName ||
      beacon.memberCardName ||
      beacon.securityCardName ||
      beacon.cardName ||
      'Unknown'
    );
  };

  // Ambil semua topic tracking/*
  const trackingTopics = Object.keys(beaconsByTopic) ;

  // Gabungkan semua beacon
  const allBeacons = Object.values(
    trackingTopics.reduce<Record<string, any>>((acc, topic) => {
      const beacons = beaconsByTopic[topic] || {};

      Object.values(beacons).forEach((beacon: any) => {
        const key = beacon.dmac || beacon.beaconId || beacon.cardNumber;

        if (!key) return;

        const existing = acc[key];

        // take newest by lastSeen (preferred)
        if (
          !existing ||
          (beacon.lastSeen ?? new Date(beacon.time).getTime()) >
            (existing.lastSeen ?? new Date(existing.time).getTime())
        ) {
          acc[key] = beacon;
        }
      });

      return acc;
    }, {})
  );

  let displayBeacons = allBeacons;
  if (followedOnly) {
    const activeFollowed = followingPersons.length > 0 ? followingPersons : (followingPerson ? [followingPerson] : []);
    const followedCardNumbers = new Set(
      activeFollowed.map((p) => (p.bleCardNumber || p.id || '').toLowerCase()).filter(Boolean)
    );

    displayBeacons = allBeacons.filter((beacon) => {
      const bDmac = (beacon.dmac || beacon.beaconId || beacon.cardNumber || '').toLowerCase();
      const bVisitorId = (beacon.visitorCardId || '').toLowerCase();
      const bMemberId = (beacon.memberCardId || '').toLowerCase();
      const bSecurityId = (beacon.securityCardId || '').toLowerCase();

      const v = bVisitorId ? visitorMap.get(bVisitorId) : null;
      const m = bMemberId ? memberMap.get(bMemberId) : null;
      const s = bSecurityId ? securityMap.get(bSecurityId) : null;

      const cardNumbers = [
        bDmac,
        (v?.bleCardNumber || v?.personId || v?.id || '').toLowerCase(),
        (m?.bleCardNumber || m?.personId || m?.id || '').toLowerCase(),
        (s?.bleCardNumber || s?.personId || s?.id || '').toLowerCase(),
      ];

      return cardNumbers.some((c) => c && followedCardNumbers.has(c));
    });
  }
  // console.log('All Beacons:', allBeacons);
  // Urutkan berdasarkan waktu terbaru
//   allBeacons.sort((a, b) =>
//   (b.lastSeen ?? new Date(b.time).getTime()) -
//   (a.lastSeen ?? new Date(a.time).getTime())
// );
  const getItemBackground = (isVisitor: boolean, isMember: boolean, isSecurity: boolean) => {
    const baseColor = isMember ? COLORS.member : isVisitor ? COLORS.visitor : isSecurity ? COLORS.security : '#e0e0e0';

    return `linear-gradient(
      90deg,
      ${baseColor} 0%,
      ${lighten(baseColor, 0.5)} 100%
    )`;
  };
  const getBorderColor = (isVisitor: boolean, isMember: boolean, isSecurity: boolean, isBlacklisted: boolean) => {
    if (isBlacklisted) return COLORS.blacklist;
    if (isMember) return COLORS.member;
    if (isVisitor) return COLORS.visitor;
    if (isSecurity) return COLORS.security;
    return '#ccc';
  };

  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const SummaryColumn = ({
    name,
    area,
    type,
    time,
    beacon,
  }: {
    name: string;
    area?: string | null;
    type: string;
    time: string;
    beacon?: any;
  }) => {
    const lastSeen = beacon?.lastSeen ?? (beacon?.time ? new Date(beacon.time).getTime() : 0);
    const isUndetected = lastSeen ? Date.now() - lastSeen > 5000 : false;
    const areaValue = isUndetected
      ? `Undetected - Last Detected in : ${area || 'Unknown Area'}`
      : (area ?? 'Unknown Area');

    return (
      <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          {/* <InfoRow label="Name" value={name} /> */}
          <InfoRow label="Time" value={time} />
          <InfoRow label="Area" value={areaValue} />
          <InfoRow label="Type" value={type} />
        </Stack>
      </Box>
    );
  };

  const VisitorDetails = ({ visitor, beacon }: { visitor: VisitorType; beacon: any }) => {
    const lastSeen = beacon?.lastSeen ?? (beacon?.time ? new Date(beacon.time).getTime() : 0);
    const isUndetected = lastSeen ? Date.now() - lastSeen > 5000 : false;

    return (
      <Box mt={1}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, wordBreak: 'break-word' }}>
              {visitor.name}
            </Typography>

            {isUndetected && <Chip label="UNDETECTED" size="small" sx={chipSx} />}
            {visitor.isVip && <Chip label="VIP" color="warning" size="small" sx={chipSx} />}
            {visitor.isBlacklist && <Chip label="BLACKLIST" size="small" sx={chipSx} />}
          </Box>

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', wordBreak: 'break-word' }}>
            Person ID: {visitor.personId}
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={2}>
          {/* Column 1 – Summary */}
          <SummaryColumn
            name={visitor.name}
            area={beacon.maskedAreaName}
            type="Visitor"
            time={new Date(beacon.time).toLocaleString()}
            beacon={beacon}
          />

          {/* Column 2 – Personal */}
          <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <InfoRow label="Address" value={visitor.address} />
              <InfoRow label="Phone" value={visitor.phone} />
              <InfoRow label="Email" value={visitor.email} />
            </Stack>
          </Box>

          {/* Column 3 – Identity */}
          <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <InfoRow label="Identity" value={`${visitor.identityType || 'ID'} - ${visitor.identityId || '-'}`} />
              <InfoRow label="Gender" value={visitor.gender} />
              <InfoRow label="Card Number" value={visitor.cardNumber} />
            </Stack>
          </Box>

          {/* Column 4 – Organization */}
          <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <InfoRow label="Organization" value={visitor.organizationName} />
              <InfoRow label="Department" value={visitor.departmentName} />
              <InfoRow label="District" value={visitor.districtName} />
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  };

  const MemberDetails = ({ member, beacon }: { member: memberType; beacon: any }) => {
    const lastSeen = beacon?.lastSeen ?? (beacon?.time ? new Date(beacon.time).getTime() : 0);
    const isUndetected = lastSeen ? Date.now() - lastSeen > 5000 : false;

    return (
      <Box mt={1}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, wordBreak: 'break-word' }}>
              {member.name}
            </Typography>

            {isUndetected && <Chip label="UNDETECTED" size="small" sx={chipSx} />}
            {member.isBlacklist && <Chip label="BLACKLIST" size="small" sx={chipSx} />}
          </Box>

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', wordBreak: 'break-word' }}>
            Person ID: {member.personId}
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={2}>
          {/* Column 1 – Summary */}
          <SummaryColumn
            name={member.name}
            area={beacon.maskedAreaName}
            type="Member"
            time={new Date(beacon.time).toLocaleString()}
            beacon={beacon}
          />

          {/* Column 2 – Personal */}
          <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <InfoRow label="Address" value={member.address} />
              <InfoRow label="Phone" value={member.phone} />
              <InfoRow label="Email" value={member.email} />
            </Stack>
          </Box>

          {/* Column 3 – Identity */}
          <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <InfoRow label="Identity" value={`ID - ${member.identityId || '-'}`} />
              <InfoRow label="Gender" value={member.gender} />
              <InfoRow label="Card Number" value={member.cardNumber} />
            </Stack>
          </Box>

          {/* Column 4 – Organization */}
          <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <InfoRow
                label="Organization"
                value={[member.organization?.name, member.department?.name, member.district?.name]
                  .filter(Boolean)
                  .join(' - ')}
              />
              <InfoRow label="Head Member 1" value={member.headMember1} />
              <InfoRow label="Head Member 2" value={member.headMember2} />
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto', p: 0.5, scrollSnapType: 'y mandatory' }}>
      {displayBeacons.map((beacon: any, idx) => {
        const isVisitor = !!beacon.visitorCardId;
        const isMember = !!beacon.memberCardId;
        const isSecurity = !!beacon.securityCardId;
        // console.log('Beacon Data:', beacon);
        const cardName = getDisplayName(beacon);
        const visitor = beacon.visitorCardId
          ? visitorMap.get(beacon.visitorCardId.toLowerCase())
          : null;

        const member = beacon.memberCardId
          ? memberMap.get(beacon.memberCardId.toLowerCase())
          : null;

        const security = beacon.securityCardId
          ? securityMap.get(beacon.securityCardId.toLowerCase())
          : null;

        // console.log("Beacons: ", beaconsByTopic);
        const faceImage = visitor?.faceImage || member?.faceImage || security?.faceImage || '/dummy-avatar.jpg';
        const isBlacklisted = visitor?.isBlacklist === true || member?.isBlacklist === true || security?.isBlacklist === true;
        // console.log(visitor, member, beacon);
        // console.log('Face Image URL:', faceImage);
        return (
          <Box
            key={idx}
            sx={{
              position: 'relative',
              p: 2,
              mb: 2,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: getBorderColor(isVisitor, isMember, isSecurity, isBlacklisted),
              background: getItemBackground(isVisitor, isMember, isSecurity),
              color: '#fff',
              overflow: 'hidden',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: isBlacklisted ? 6 : 3,
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }} alignItems="flex-start">
              {/* FOTO */}
              <Box flexShrink={0} sx={{ pt: 0.5 }}>
                <Avatar
                  src={`${BASE_URL}${faceImage}`}
                  sx={{
                    width: 70,
                    height: 70,
                    border: isBlacklisted ? '5px solid' : '3px solid',
                    borderColor: isBlacklisted
                      ? COLORS.blacklist
                      : isMember
                      ? COLORS.member
                      : COLORS.visitor,
                    boxShadow: isBlacklisted ? '0 0 10px rgba(139,0,0,0.8)' : 'none',
                  }}
                />
              </Box>

              {/* INFO */}
              <Box flexGrow={1} minWidth={0} mb={1}>
                {visitor && <VisitorDetails visitor={visitor} beacon={beacon} />}
                {member && <MemberDetails member={member} beacon={beacon} />}
                {security && <MemberDetails member={security} beacon={beacon} />}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default NewestTrack;
