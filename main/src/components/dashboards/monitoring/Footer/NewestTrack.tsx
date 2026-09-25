import {
  Box,
  Typography,
  Grid2 as Grid,
  Avatar,
  Chip,
  Paper,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  IconDotsVertical,
  IconMapPin,
  IconClock,
  IconId,
  IconPhone,
  IconUser,
  IconMail,
  IconBuildingSkyscraper,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { RootState } from 'src/store/Store';
import { BASE_URL } from 'src/utils/axios';
import TrackingDetailPopup from '../Popup/TrackingDetailPopup';

const ROLE_THEMES: Record<
  'Member' | 'Visitor' | 'Security',
  {
    primary: string;
    lightBg: string;
    chipBg: string;
    chipColor: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  Member: {
    primary: '#1976d2', // Blue
    lightBg: 'rgba(25, 118, 210, 0.05)',
    chipBg: 'rgba(25, 118, 210, 0.12)',
    chipColor: '#1976d2',
    iconBg: 'rgba(25, 118, 210, 0.12)',
    iconColor: '#1976d2',
  },
  Visitor: {
    primary: '#f50057', // Red
    lightBg: 'rgba(245, 0, 87, 0.05)',
    chipBg: 'rgba(245, 0, 87, 0.12)',
    chipColor: '#f50057',
    iconBg: 'rgba(245, 0, 87, 0.12)',
    iconColor: '#f50057',
  },
  Security: {
    primary: '#00c853', // Green
    lightBg: 'rgba(0, 200, 83, 0.05)',
    chipBg: 'rgba(0, 200, 83, 0.12)',
    chipColor: '#00c853',
    iconBg: 'rgba(0, 200, 83, 0.12)',
    iconColor: '#00c853',
  },
};

const DetailItem = ({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: any;
  label: string;
  value?: string | null;
  iconBg: string;
  iconColor: string;
}) => (
  <Box display="flex" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        minWidth: 32,
        borderRadius: '50%',
        bgcolor: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={18} stroke={2} />
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          fontWeight: 700,
          display: 'block',
          lineHeight: 1.1,
          mb: 0.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}
        title={value || '-'}
      >
        {value || '-'}
      </Typography>
    </Box>
  </Box>
);

type TrackCardProps = {
  beacon: any;
  visitorMap: Map<string, VisitorType>;
  memberMap: Map<string, memberType>;
  securityMap: Map<string, any>;
  membersData?: memberType[];
  visitorsData?: VisitorType[];
  securityData?: any[];
  isSidebar?: boolean;
};

const TrackCard = ({
  beacon,
  visitorMap,
  memberMap,
  securityMap,
  membersData = [],
  visitorsData = [],
  securityData = [],
  isSidebar = false,
}: TrackCardProps) => {
  const [openTrackDetail, setOpenTrackDetail] = useState(false);

  const visitor =
    (beacon.visitorCardId && visitorMap.get(beacon.visitorCardId.toLowerCase())) ||
    visitorsData.find(
      (v) =>
        (beacon.dmac && v.bleCardNumber?.toLowerCase() === beacon.dmac.toLowerCase()) ||
        (beacon.cardNumber && String(v.cardNumber) === String(beacon.cardNumber)),
    ) ||
    null;

  const member =
    (beacon.memberCardId && memberMap.get(beacon.memberCardId.toLowerCase())) ||
    membersData.find(
      (m) =>
        (beacon.dmac && m.bleCardNumber?.toLowerCase() === beacon.dmac.toLowerCase()) ||
        (beacon.cardNumber && String(m.cardNumber) === String(beacon.cardNumber)),
    ) ||
    null;

  const security =
    (beacon.securityCardId && securityMap.get(beacon.securityCardId.toLowerCase())) ||
    securityData.find(
      (s) =>
        (beacon.dmac && s.bleCardNumber?.toLowerCase() === beacon.dmac.toLowerCase()) ||
        (beacon.cardNumber && String(s.cardNumber) === String(beacon.cardNumber)),
    ) ||
    null;

  const isVisitor = !!visitor || !!beacon.visitorCardId;
  const isSecurity = !!security || !!beacon.securityCardId;
  const isMember = (!isVisitor && !isSecurity) || !!member || !!beacon.memberCardId;

  let roleType: 'Member' | 'Visitor' | 'Security' = 'Member';
  if (isSecurity) roleType = 'Security';
  else if (isVisitor) roleType = 'Visitor';
  else if (isMember) roleType = 'Member';

  const roleStyle = ROLE_THEMES[roleType] || ROLE_THEMES.Member;

  const isBlacklisted =
    visitor?.isBlacklist === true ||
    member?.isBlacklist === true ||
    security?.isBlacklist === true;

  const name =
    visitor?.name ||
    member?.name ||
    security?.name ||
    beacon.visitorCardName ||
    beacon.memberCardName ||
    beacon.securityCardName ||
    beacon.cardName ||
    'Unknown';

  // NIK / Display identifier for card header
  const displayPersonId =
    visitor?.personId ||
    member?.personId ||
    security?.personId ||
    visitor?.identityId ||
    member?.identityId ||
    security?.identityId ||
    null;

  // Actual primary key GUID used by API / CompactTrackingDetailModal (matching BeaconDetailPopup)
  const targetPersonId = member?.id || visitor?.id || security?.id || null;

  const faceImage = visitor?.faceImage || member?.faceImage || security?.faceImage;

  const lastSeen = beacon?.lastSeen ?? (beacon?.time ? new Date(beacon.time).getTime() : 0);
  const isUndetected = lastSeen ? Date.now() - lastSeen > 5000 : false;
  const formattedTime = beacon?.time ? new Date(beacon.time).toLocaleString() : '-';
  const area = beacon.maskedAreaName || 'Unknown Area';

  const phone = visitor?.phone || member?.phone || security?.phone || '-';
  const email = visitor?.email || member?.email || security?.email || '-';

  let identity = '-';
  if (visitor) {
    identity = `${visitor.identityType || 'ID'} - ${visitor.identityId || '-'}`;
  } else if (member) {
    identity = `ID - ${member.identityId || '-'}`;
  } else if (security) {
    identity = `ID - ${security.identityId || '-'}`;
  }

  const gender = visitor?.gender || member?.gender || security?.gender || '-';
  const cardNumber =
    visitor?.cardNumber ||
    member?.cardNumber ||
    security?.cardNumber ||
    beacon.cardNumber ||
    beacon.dmac ||
    '-';

  let orgValue = '-';
  let col2Label = 'HEAD MEMBER 1';
  let col2Value = '-';
  let col3Label = 'HEAD MEMBER 2';
  let col3Value = '-';

  if (visitor) {
    orgValue = visitor.organizationName || '-';
    col2Label = 'DEPARTMENT';
    col2Value = visitor.departmentName || '-';
    col3Label = 'DISTRICT';
    col3Value = visitor.districtName || '-';
  } else if (member) {
    orgValue =
      [member.organization?.name, member.department?.name, member.district?.name]
        .filter(Boolean)
        .join(' - ') || '-';
    col2Label = 'HEAD MEMBER 1';
    const head1 = member.memberHead1 || member.headMember1;
    col2Value = typeof head1 === 'object' ? (head1 as any)?.name || '-' : head1 || '-';
    col3Label = 'HEAD MEMBER 2';
    const head2 = member.memberHead2 || member.headMember2;
    col3Value = typeof head2 === 'object' ? (head2 as any)?.name || '-' : head2 || '-';
  } else if (security) {
    orgValue =
      [security.organization?.name, security.department?.name, security.district?.name]
        .filter(Boolean)
        .join(' - ') || '-';
    col2Label = 'HEAD MEMBER 1';
    const sHead1 = security.headMember1;
    col2Value = typeof sHead1 === 'object' ? (sHead1 as any)?.name || '-' : sHead1 || '-';
    col3Label = 'HEAD MEMBER 2';
    const sHead2 = security.headMember2;
    col3Value = typeof sHead2 === 'object' ? (sHead2 as any)?.name || '-' : sHead2 || '-';
  }

  const person = member || visitor || security;
  const resolvedPerson = person || ({
    id: person?.id || '',
    name,
    cardNumber,
    faceImage,
  } as any);

  const bleId =
    visitor?.bleCardNumber ||
    member?.bleCardNumber ||
    security?.bleCardNumber ||
    beacon.dmac ||
    beacon.beaconId ||
    beacon.cardNumber ||
    '';

  return (
    <>
    <Paper
      elevation={0}
      sx={{
        p: isSidebar ? 1.75 : 2.5,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* 1. Header: Avatar, Name, Role Chip, Blacklist Chip, ID, and 3-dots */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.75}>
        <Box display="flex" alignItems="center" gap={1.25} sx={{ minWidth: 0, flex: 1 }}>
          <Avatar
            src={faceImage ? `${BASE_URL}${faceImage}` : undefined}
            sx={{
              width: isSidebar ? 46 : 56,
              height: isSidebar ? 46 : 56,
              bgcolor: roleStyle.primary,
              border: isBlacklisted ? '3px solid #d32f2f' : '2px solid transparent',
              boxShadow: isBlacklisted ? '0 0 10px rgba(211, 47, 47, 0.4)' : 'none',
              flexShrink: 0,
            }}
          >
            {!faceImage && <IconUser size={isSidebar ? 24 : 30} color="#fff" />}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: isSidebar ? '1.02rem' : '1.15rem',
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {name}
              </Typography>

              <Chip
                label={roleType.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: roleStyle.chipBg,
                  color: roleStyle.chipColor,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20,
                  letterSpacing: '0.5px',
                  borderRadius: '10px',
                }}
              />

              {isBlacklisted && (
                <Chip
                  label="BLACKLISTED"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(211, 47, 47, 0.12)',
                    border: '1px solid #ef5350',
                    color: '#d32f2f',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 20,
                    letterSpacing: '0.5px',
                    borderRadius: '10px',
                  }}
                />
              )}

              {isUndetected && (
                <Chip
                  label="UNDETECTED"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 152, 0, 0.12)',
                    color: '#ed6c02',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 20,
                    borderRadius: '10px',
                  }}
                />
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={1.5} mt={0.3} flexWrap="wrap">
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: isSidebar ? '0.78rem' : '0.85rem',
                }}
              >
                ID: {displayPersonId || '-'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: isSidebar ? '0.78rem' : '0.85rem',
                }}
              >
                Card: {cardNumber}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Tooltip title={isSecurity ? 'No tracking details for security' : 'View Tracking Detail'}>
          <span>
            <IconButton
              size="small"
              disabled={isSecurity}
              onClick={() => {
                if (isSecurity) return;
                setOpenTrackDetail(true);
              }}
              sx={{
                color: isSecurity ? 'action.disabled' : 'text.secondary',
                flexShrink: 0,
                p: 0.5,
              }}
            >
              <IconDotsVertical size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* 2. Hero Banner: Current Area & Last Seen Time */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isSidebar ? 'column' : 'row',
          alignItems: isSidebar ? 'flex-start' : 'center',
          gap: isSidebar ? 1.25 : 2,
          p: 1.5,
          px: isSidebar ? 1.5 : 2,
          borderRadius: '12px',
          bgcolor: roleStyle.lightBg,
          mb: 1.75,
        }}
      >
        {/* Left: Current Area */}
        <Box display="flex" alignItems="center" gap={1.25} sx={{ width: isSidebar ? '100%' : 'auto', flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              minWidth: 34,
              borderRadius: '50%',
              bgcolor: roleStyle.iconBg,
              color: roleStyle.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconMapPin size={18} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: isUndetected ? '#d32f2f' : 'text.secondary',
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              {isUndetected ? '⚠️ LAST DETECTED AREA' : 'CURRENT AREA'}
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'text.primary',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={area}
            >
              {area}
            </Typography>
          </Box>
        </Box>

        {/* Right: Last Seen Time */}
        <Box display="flex" alignItems="center" gap={1.25} sx={{ width: isSidebar ? '100%' : 'auto', flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              minWidth: 34,
              borderRadius: '50%',
              bgcolor: roleStyle.iconBg,
              color: roleStyle.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconClock size={18} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              LAST SEEN TIME
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'text.primary',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {formattedTime}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 3. Info Grid: 2 columns in footer, 1 column in sidebar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isSidebar ? '1fr' : '1fr 1fr',
          columnGap: 2.5,
          rowGap: 1.25,
          mb: 1.75,
        }}
      >
        <DetailItem
          icon={IconPhone}
          label="PHONE"
          value={phone}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />
        <DetailItem
          icon={IconId}
          label="IDENTITY"
          value={identity}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />

        <DetailItem
          icon={IconMail}
          label="EMAIL"
          value={email}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />
        <DetailItem
          icon={IconUser}
          label="GENDER"
          value={gender}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />
      </Box>

      {/* 4. Footer Row: Organization & Head Members */}
      <Divider
        sx={{
          my: 1.5,
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isSidebar ? '1fr' : { xs: '1fr', sm: '1.4fr 1fr 1fr' },
          columnGap: 2,
          rowGap: 1.25,
          alignItems: 'center',
        }}
      >
        <DetailItem
          icon={IconBuildingSkyscraper}
          label="ORGANIZATION"
          value={orgValue}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />
        <DetailItem
          icon={IconUsers}
          label={col2Label}
          value={col2Value}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />
        <DetailItem
          icon={IconUsers}
          label={col3Label}
          value={col3Value}
          iconBg={roleStyle.iconBg}
          iconColor={roleStyle.iconColor}
        />
      </Box>
    </Paper>

    {!isSecurity && openTrackDetail && (
      <TrackingDetailPopup
        bleNumber={bleId}
        person={resolvedPerson}
        personId={targetPersonId || ''}
        openTrackDetail={openTrackDetail}
        setOpenTrackDetail={setOpenTrackDetail}
        isSecurity={isSecurity}
        isMember={isMember}
        isVisitor={isVisitor}
      />
    )}
  </>
);
};

type NewestTrackProps = {
  followedOnly?: boolean;
  isSidebar?: boolean;
};

const NewestTrack = ({ followedOnly = false, isSidebar }: NewestTrackProps) => {
  const isSidebarMode = isSidebar ?? followedOnly;
  const beaconsByTopic = useSelector((state: RootState) => state.BeaconReducer.allBeacons);
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  const followingPersons = useSelector((state: RootState) => state.layoutReducer.followingPersons ?? []);
  const { data: visitorsData = [] } = useAllVisitor();
  const { data: membersData = [] } = useAllMembers();
  const { data: securityData = [] } = useAllSecuritys();

  const visitorMap = useMemo(() => new Map(visitorsData.map((v) => [v.id.toLowerCase(), v])), [visitorsData]);
  const memberMap = useMemo(() => new Map(membersData.map((m) => [m.id.toLowerCase(), m])), [membersData]);
  const securityMap = useMemo(() => new Map(securityData.map((s) => [s.id.toLowerCase(), s])), [securityData]);

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
  const trackingTopics = Object.keys(beaconsByTopic);

  // Gabungkan semua beacon
  const allBeacons = useMemo(() => {
    return Object.values(
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
  }, [beaconsByTopic, trackingTopics]);

  let displayBeacons = allBeacons;
  if (followedOnly) {
    const activeFollowed = followingPersons.length > 0 ? followingPersons : followingPerson ? [followingPerson] : [];
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

  // Search, Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [personTypeFilter, setPersonTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, blacklist, normal
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'card'>('time');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const processedBeacons = useMemo(() => {
    let list = [...displayBeacons];

    // Search by name, card number, or identity
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((beacon) => {
        const name = getDisplayName(beacon).toLowerCase();
        const dmac = (beacon.dmac || beacon.beaconId || beacon.cardNumber || '').toLowerCase();
        const visitor = beacon.visitorCardId ? visitorMap.get(beacon.visitorCardId.toLowerCase()) : null;
        const member = beacon.memberCardId ? memberMap.get(beacon.memberCardId.toLowerCase()) : null;
        const security = beacon.securityCardId ? securityMap.get(beacon.securityCardId.toLowerCase()) : null;
        const identity = (visitor?.identityId || member?.identityId || security?.identityId || '').toLowerCase();
        return name.includes(q) || dmac.includes(q) || identity.includes(q);
      });
    }

    // Person type filter
    if (personTypeFilter !== 'all') {
      list = list.filter((beacon) => {
        if (personTypeFilter === 'visitor') return !!beacon.visitorCardId;
        if (personTypeFilter === 'member') return !!beacon.memberCardId;
        if (personTypeFilter === 'security') return !!beacon.securityCardId;
        return true;
      });
    }

    // Blacklist/Normal status filter
    if (statusFilter !== 'all') {
      list = list.filter((beacon) => {
        const visitor = beacon.visitorCardId ? visitorMap.get(beacon.visitorCardId.toLowerCase()) : null;
        const member = beacon.memberCardId ? memberMap.get(beacon.memberCardId.toLowerCase()) : null;
        const security = beacon.securityCardId ? securityMap.get(beacon.securityCardId.toLowerCase()) : null;
        const isBlacklisted =
          visitor?.isBlacklist === true || member?.isBlacklist === true || security?.isBlacklist === true;
        return statusFilter === 'blacklist' ? isBlacklisted : !isBlacklisted;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = a.lastSeen ?? new Date(a.time).getTime() ?? 0;
        const timeB = b.lastSeen ?? new Date(b.time).getTime() ?? 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (sortBy === 'name') {
        const nameA = getDisplayName(a).toLowerCase();
        const nameB = getDisplayName(b).toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === 'card') {
        const cardA = (a.dmac || a.beaconId || a.cardNumber || '').toLowerCase();
        const cardB = (b.dmac || b.beaconId || b.cardNumber || '').toLowerCase();
        return sortOrder === 'asc' ? cardA.localeCompare(cardB) : cardB.localeCompare(cardA);
      }
      return 0;
    });

    return list;
  }, [displayBeacons, searchTerm, personTypeFilter, statusFilter, sortBy, sortOrder, visitorMap, memberMap, securityMap]);

  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search and Filters Bar (hidden in sidebar mode) */}
      {!isSidebarMode && (
        <Box
          sx={{
            p: 1.5,
            mb: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 1.5,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', flex: 1, minWidth: 260 }}>
            <TextField
              size="small"
              placeholder="Search person, card, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ minWidth: 240, maxWidth: 360, flex: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="person-filter-label">Type</InputLabel>
              <Select
                labelId="person-filter-label"
                label="Type"
                value={personTypeFilter}
                onChange={(e) => setPersonTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="visitor">Visitor</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="security">Security</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="blacklist">Blacklist</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="sort-by-label">Sort By</InputLabel>
              <Select
                labelId="sort-by-label"
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <MenuItem value="time">Last Seen</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="card">Card Number</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="sort-order-label">Order</InputLabel>
              <Select
                labelId="sort-order-label"
                label="Order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <MenuItem value="desc">Desc (Newest/Z-A)</MenuItem>
                <MenuItem value="asc">Asc (Oldest/A-Z)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Typography variant="body2" color="textSecondary">
            Total: <strong>{processedBeacons.length}</strong> tracked
          </Typography>
        </Box>
      )}

      {/* Cards Scroll Container - 1 card per row in sidebar, 2 cards per row on md+ in footer */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: isSidebarMode ? 0 : 0.5 }}>
        {processedBeacons.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">
              {isSidebarMode ? 'No followed people active' : 'No active tracking records found'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={isSidebarMode ? 1.5 : 2}>
            {processedBeacons.map((beacon: any, idx) => (
              <Grid size={isSidebarMode ? 12 : { xs: 12, md: 6 }} key={idx}>
                <TrackCard
                  beacon={beacon}
                  visitorMap={visitorMap}
                  memberMap={memberMap}
                  securityMap={securityMap}
                  membersData={membersData}
                  visitorsData={visitorsData}
                  securityData={securityData}
                  isSidebar={isSidebarMode}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default NewestTrack;
