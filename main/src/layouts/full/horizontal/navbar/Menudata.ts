import {
  IconHome,
  IconPoint,
  IconApps,
  IconAppWindow,
  IconDeviceDesktopAnalytics,
  IconBuilding,
  IconMap,
  IconBellExclamation,
  IconLicense,
  IconLiveView,
  IconBarrierBlock,
  IconMapPin,
  IconDeviceIpad,
  IconDeviceCctv,
  IconIdBadge,
  IconDevices,
  IconAffiliate,
  IconCropLandscape,
  IconBadgeTm,
  IconUsers,
  IconCalendar,
  IconBell,
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';
import { AlarmSettingType } from 'src/store/apps/alarmsetting/alarmSettings';

const useMenuItems = (alarmSettings: AlarmSettingType[]) => {
  // 🔹 Determine active alarms
  const alarms = Array.isArray(alarmSettings) ? alarmSettings : [];
  // console.log("ALARM SETTINGS IN MENU: ", alarms);
const normalize = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '');

const isActive = (name: string) =>
  alarms.some(a => normalize(a?.alarmCategory) === name && a?.isEnabled);

const isGeoFencingActive = isActive('geofence');
const isOverPopulatingActive = isActive('overpopulating');
const isStayOnAreaActive = isActive('stayonarea');
const isBoundaryActive = isActive('boundary');


  // 🔹 Define all menu items (before filtering)
  const Menuitems = [
    {
      id: uniqueId(),
      title: 'Dashboard',
      icon: IconHome,
      href: '/dashboards/',
      children: [
        {
          id: uniqueId(),
          title: 'Main Menu',
          icon: IconHome,
          href: '/dashboards/mainmenu',
        },
        {
          id: uniqueId(),
          title: 'Monitoring',
          icon: IconDeviceDesktopAnalytics,
          href: '/dashboards/monitoring/viewer',
          children: [
            {
              id: uniqueId(),
              title: 'Viewer',
              icon: IconPoint,
              href: '/dashboards/monitoring/viewer',
            },
            {
              id: uniqueId(),
              title: 'Configuration',
              icon: IconPoint,
              href: '/dashboards/monitoring/config',
            },
          ],
        },
      ],
    },

    {
      id: uniqueId(),
      title: 'Master',
      icon: IconAppWindow,
      href: '/master/',
      children: [
        {
          id: uniqueId(),
          title: 'Company',
          icon: IconAffiliate,
          children: [
            { id: uniqueId(), title: 'Organization', icon: IconAffiliate, href: '/master/organization/' },
            { id: uniqueId(), title: 'Department', icon: IconAffiliate, href: '/master/department/' },
            { id: uniqueId(), title: 'District', icon: IconAffiliate, href: '/master/district/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Building',
          icon: IconBuilding,
          children: [
            { id: uniqueId(), title: 'Building', icon: IconBuilding, href: '/master/building/' },
            { id: uniqueId(), title: 'Floor', icon: IconMap, href: '/master/floor/' },
            { id: uniqueId(), title: 'Floor Plan', icon: IconMap, href: '/master/floorplan/' },
            { id: uniqueId(), title: 'Floor Plan Masked Area', icon: IconCropLandscape, href: '/master/floorplanmaskedarea/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Devices',
          icon: IconDevices,
          children: [
            { id: uniqueId(), title: 'Brand', icon: IconBadgeTm, href: '/master/brand/' },
            // { id: uniqueId(), title: 'Access CCTV', icon: IconDeviceCctv, href: '/master/accesscctv/' },
            // { id: uniqueId(), title: 'Access Control --(WIP)--', icon: IconIdBadge, href: '/master/accesscontrol/' },
            { id: uniqueId(), title: 'Ble Reader', icon: IconDeviceIpad, href: '/master/blereader/' },
            { id: uniqueId(), title: 'Device Mapping', icon: IconDevices, href: '/master/device/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Card',
          icon: IconMapPin,
          children: [
            { id: uniqueId(), title: 'Card', icon: IconMapPin, href: '/master/card/' },
            { id: uniqueId(), title: 'Card Group', icon: IconMapPin, href: '/master/cardgroup/' },
            { id: uniqueId(), title: 'Card Access', icon: IconMapPin, href: '/master/cardaccess/' },
          ],
        },
        { id: uniqueId(), title: 'Member Data', icon: IconUsers, href: '/master/membertag/' },
        { id: uniqueId(), title: 'Time Group', icon: IconCalendar, href: '/master/timegroup/' },
        // { id: uniqueId(), title: 'Integration --(WIP)--', icon: IconLicense, href: '/master/integration/' },
        // { id: uniqueId(), title: 'Users --(WIP)--', icon: IconMapPin, href: '/master/user/' },
        { id: uniqueId(), title: 'Application', icon: IconAppWindow, href: '/master/application/' },
      ],
    },

    {
      id: uniqueId(),
      title: 'Alarm Settings',
      icon: IconBell,
      href: '/alarmsetting/',
      children: [
        { id: uniqueId(), title: 'Alarm Setting', icon: IconBell, href: '/alarmsetting/' },
        ...(isGeoFencingActive
          ? [{ id: uniqueId(), title: 'GeoFencing Alarm', icon: IconBellExclamation, href: '/alarmsetting/geofencing/' }]
          : []),
        ...(isOverPopulatingActive
          ? [{ id: uniqueId(), title: 'OverPopulating Alarm', icon: IconBellExclamation, href: '/alarmsetting/overpopulating/' }]
          : []),
        ...(isStayOnAreaActive
          ? [{ id: uniqueId(), title: 'Stay On Area Alarm', icon: IconBellExclamation, href: '/alarmsetting/stayonarea/' }]
          : []),
        ...(isBoundaryActive
          ? [{ id: uniqueId(), title: 'Boundary Alarm', icon: IconBellExclamation, href: '/alarmsetting/boundary/' }]
          : []),
      ],
    },

    {
      id: uniqueId(),
      title: 'Visitor',
      icon: IconMapPin,
      href: '/visitor/',
      children: [
        { id: uniqueId(), title: 'Visitor Data', icon: IconMapPin, href: '/visitor/visitordata/' },
        { id: uniqueId(), title: 'Visitor Invitation', icon: IconMapPin, href: '/visitor/visitorinvitation/' },
        // { id: uniqueId(), title: 'Blacklist', icon: IconBarrierBlock, href: '/visitor/blacklist/' },
      ],
    },

    {
      id: uniqueId(),
      title: 'Report',
      icon: IconApps,
      href: '/report/',
      children: [
        // { id: uniqueId(), title: 'Tracking Transaction', icon: IconLiveView, href: '/report/trackingtransaction/' },
        // { id: uniqueId(), title: 'Alarm Notification', icon: IconBellExclamation, href: '/report/alarmRecord/' },
        { id: uniqueId(), title: 'Alarm Trigger', icon: IconBellExclamation, href: '/report/alarmTrigger/' },
        { id: uniqueId(), title: 'Alarm List', icon: IconBellExclamation, href: '/report/alarmlist/' },
        { id: uniqueId(), title: 'Card Record', icon: IconBarrierBlock, href: '/report/cardrecord/' },
        // { id: uniqueId(), title: 'Test Record', icon: IconCalendar, href: '/report/testrecord/' },
        { id: uniqueId(), title: 'Visitor Report', icon: IconCalendar, href: '/report/visitorreport/filter/'},
        { id: uniqueId(), title: 'Investigate', icon: IconCalendar, href: '/report/investigate'},
      ],
    },
  ];

  // 🔹 Role-based rules (same as router)
  const levelPriority = localStorage.getItem('levelPriority');
  const roleAccessRules: Record<string, string[]> = {
    System: ['*'],
    SuperAdmin: ['*', '!/master/application'],
    PrimaryAdmin: ['/dashboards/', '/report/', '/visitor/visitorinvitation'],
    Primary: ['/dashboards/monitoring'],
    Secondary: ['/my-visit/'],
    UserCreated: ['/my-visit/'],
  };

  const isAllowedPath = (path: string): boolean => {
    if (!levelPriority) return false;
    const rules = roleAccessRules[levelPriority];
    if (!rules) return false;

    if (rules.includes('*')) {
      const denied = rules
        .filter((r) => r.startsWith('!'))
        .some((r) => path.startsWith(r.slice(1)));
      return !denied;
    }

    return rules.some((r) => path.startsWith(r));
  };

  // 🔹 Recursive filter that excludes `children` key if empty
  const filterMenu = (items: any[]): any[] =>
    items
      .map((item) => {
        const filteredChildren = item.children ? filterMenu(item.children) : undefined;
        const allowed = isAllowedPath(item.href || '');
        // keep item if allowed or it has valid children
        if (allowed || (filteredChildren && filteredChildren.length > 0)) {
          const newItem = { ...item };
          if (filteredChildren && filteredChildren.length > 0) {
            newItem.children = filteredChildren;
          } else {
            delete newItem.children;
          }
          return newItem;
        }
        return null;
      })
      .filter(Boolean);

  const filteredMenu = filterMenu(Menuitems);
  return filteredMenu;
};

export default useMenuItems;
