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
  <Box sx={{ mb: 0.75 }}>
    <Typography
      variant="caption"
      textAlign="left"
      sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}
    >
      {label}
    </Typography>
    <Typography variant="body2" textAlign="left" sx={{ color: '#ffffff', fontWeight: 500 }}>
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

const NewestTrack = () => {
  const beaconsByTopic = useSelector((state: RootState) => state.BeaconReducer.allBeacons);
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
  const trackingTopics = Object.keys(beaconsByTopic).filter((x) => x.startsWith('tracking/'));

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

  // Urutkan berdasarkan nama secara alfabetis
  allBeacons.sort((a, b) =>
    getDisplayName(a).localeCompare(getDisplayName(b), undefined, {
      sensitivity: 'base', // case-insensitive
    }),
  );
  // Urutkan berdasarkan waktu terbaru
//   allBeacons.sort((a, b) =>
//   (b.lastSeen ?? new Date(b.time).getTime()) -
//   (a.lastSeen ?? new Date(a.time).getTime())
// );
  const getItemBackground = (isVisitor: boolean, isMember: boolean, isSecurity: boolean, isBlacklisted: boolean) => {
    const baseColor = isMember ? COLORS.member : isVisitor ? COLORS.visitor : isSecurity ? COLORS.security : '#e0e0e0';

    // 🔴 BLACKLISTED → color → BLACK
    if (isBlacklisted) {
      return `linear-gradient(
      90deg,
      ${baseColor} 0%,
      ${darken(baseColor, 0.5)} 100%
    )`;
    }

    // 🟢 NORMAL → color → WHITE
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

  const SummaryColumn = ({
    name,
    area,
    type,
    time,
  }: {
    name: string;
    area?: string | null;
    type: string;
    time: string;
  }) => (
    <Stack spacing={0.5} sx={{ width: '22%' }}>
      {/* <InfoRow label="Name" value={name} /> */}
      <InfoRow label="Time" value={time} />
      <InfoRow label="Area" value={area ?? 'Unknown Area'} />
      <InfoRow label="Type" value={type} />
      
    </Stack>
  );

  const VisitorDetails = ({ visitor, beacon }: { visitor: VisitorType; beacon: any }) => (
    <Box mt={1}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant='h5' sx={{ color: '#fff', fontWeight: 700 }}>{visitor.name}</Typography>

        {visitor.isVip && <Chip label="VIP" color="warning" size="small" sx={chipSx} />}
        {visitor.isBlacklist && <Chip label="BLACKLIST" size="small" sx={chipSx} />}

        <Box flexGrow={1} />

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
          Person ID: {visitor.personId}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Column 1 – Summary */}
        <SummaryColumn
          name={visitor.name}
          area={beacon.maskedAreaName}
          type="Visitor"
          time={new Date(beacon.time).toLocaleString()}
        />

        {/* Column 2 – Personal */}
        <Stack spacing={0.5} sx={{ width: '22%' }}>
          <InfoRow label="Address" value={visitor.address} />
          <InfoRow label="Phone" value={visitor.phone} />
          <InfoRow label="Email" value={visitor.email} />
        </Stack>

        {/* Column 3 – Identity */}
        <Stack spacing={0.5} sx={{ width: '22%' }}>
          <InfoRow label="Identity" value={`${visitor.identityType} - ${visitor.identityId}`} />
          <InfoRow label="Gender" value={visitor.gender} />
          <InfoRow label="Card Number" value={visitor.cardNumber} />
        </Stack>

        {/* Column 4 – Organization */}
        <Stack spacing={0.5} sx={{ width: '22%' }}>
          <InfoRow label="Organization" value={visitor.organizationName} />
          <InfoRow label="Department" value={visitor.departmentName} />
          <InfoRow label="District" value={visitor.districtName} />
        </Stack>
      </Grid>
    </Box>
  );

  const MemberDetails = ({ member, beacon }: { member: memberType; beacon: any }) => (
    <Box mt={1}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant='h5' sx={{ color: '#fff', fontWeight: 700 }}>{member.name}</Typography>

        {member.isBlacklist && <Chip label="BLACKLIST" size="small" sx={chipSx} />}

        <Box flexGrow={1} />

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
          Person ID: {member.personId}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Column 1 – Summary */}
        <SummaryColumn
          name={member.name}
          area={beacon.maskedAreaName}
          type="Member"
          time={new Date(beacon.time).toLocaleString()}
        />

        {/* Column 2 – Personal */}
        <Stack spacing={0.5} sx={{ width: '22%' }}>
          <InfoRow label="Address" value={member.address} />
          <InfoRow label="Phone" value={member.phone} />
          <InfoRow label="Email" value={member.email} />
        </Stack>

        {/* Column 3 – Identity */}
        <Stack spacing={0.5} sx={{ width: '22%' }}>
          <InfoRow label="Identity" value={`ID - ${member.identityId}`} />
          <InfoRow label="Gender" value={member.gender} />
          <InfoRow label="Card Number" value={member.cardNumber} />
        </Stack>

        {/* Column 4 – Organization */}
        <Stack spacing={0.5} sx={{ width: '22%' }}>
          <InfoRow
            label="Organization"
            value={[member.organization?.name, member.department?.name, member.district?.name]
              .filter(Boolean)
              .join(' - ')}
          />
          <InfoRow label="Head Member 1" value={member.headMember1} />
          <InfoRow label="Head Member 2" value={member.headMember2} />
        </Stack>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100%', overflowY: 'auto', p: 0.5 }}>
      {allBeacons.map((beacon: any, idx) => {
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
              background: getItemBackground(isVisitor, isMember, isSecurity, isBlacklisted),
              color: isBlacklisted ? '#fff' : 'inherit', // 🔥 important for readability
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: isBlacklisted ? 6 : 3,
                transform: 'translateY(-2px)',
              },
            }}
          >
            {/* {isBlacklisted && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                }}
              >
                <Chip
                  label="BLACKLIST"
                  size="small"
                  sx={{
                    bgcolor: '#8B0000',
                    color: '#fff',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                />
              </Box>
            )} */}
            <Grid container spacing={2}>
              {/* FOTO */}
              <Grid size={1}>
                <Avatar
                  src={`${BASE_URL}${faceImage}`}
                  sx={{
                    width: 70,
                    height: 70,
                    border: '3px solid',
                    borderColor: isBlacklisted
                      ? COLORS.blacklist
                      : isMember
                      ? COLORS.member
                      : COLORS.visitor,
                  }}
                />
              </Grid>

              {/* INFO */}
              <Grid size={11} mb={1}>
                {visitor && <VisitorDetails visitor={visitor} beacon={beacon} />}
                {member && <MemberDetails member={member} beacon={beacon} />}
                {security && <MemberDetails member={security} beacon={beacon} />}
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
};

export default NewestTrack;
