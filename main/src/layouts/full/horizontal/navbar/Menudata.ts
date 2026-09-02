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
  IconEye,
  IconBadge,
  IconMapSearch,
  IconRoute,
  IconCards,
} from '@tabler/icons-react';
import { AlarmSettingType } from 'src/store/apps/alarmsetting/alarmSettings';
import { RootState, useSelector } from 'src/store/Store';

export interface MenuItemType {
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuItemType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
  key?: string[];
}

export const useMenuItems = (alarmSettings: AlarmSettingType[]): MenuItemType[] => {
  // 🔹 Determine active alarms
  const alarms = Array.isArray(alarmSettings) ? alarmSettings : [];
  const normalize = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '');

  const isActive = (name: string) =>
    alarms.some((a) => normalize(a?.alarmCategory) === name && a?.isEnabled);

  const isGeoFencingActive = isActive('geofence');
  const isOverPopulatingActive = isActive('overpopulating');
  const isStayOnAreaActive = isActive('stayonarea');
  const isBoundaryActive = isActive('boundary');
  const activeFeatures = useSelector((state: RootState) => state.sessionReducer.activeFeatures);

  // 🔹 Define all menu items with STABLE IDs to avoid re-render reconciliation glitches
  const Menuitems: MenuItemType[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      icon: IconHome,
      href: '/dashboards/',
      children: [
        {
          id: 'dashboard-main-menu',
          title: 'Main Menu',
          icon: IconHome,
          href: '/dashboards/newmainmenu',
        },
        {
          id: 'dashboard-monitoring',
          title: 'Monitoring',
          icon: IconDeviceDesktopAnalytics,
          href: '/dashboards/monitoring/viewer',
          key: ['core.monitoring', 'core.tracking'],
          children: [
            {
              id: 'monitoring-viewer',
              title: 'Viewer',
              icon: IconPoint,
              key: ['core.monitoring', 'core.tracking'],
              href: '/dashboards/monitoring/viewer',
            },
            {
              id: 'monitoring-config',
              title: 'Configuration',
              icon: IconPoint,
              key: ['core.monitoring', 'core.tracking'],
              href: '/dashboards/monitoring/config',
            },
          ],
        },
        {
          id: 'dashboard-evacuate',
          title: 'Evacuate',
          icon: IconAppWindow,
          key: ['module.evacuation'],
          href: '/dashboards/evacuation',
        },
      ],
    },

    {
      id: 'nav-master',
      title: 'Master',
      icon: IconAppWindow,
      href: '/master/',
      key: ['core.masterData'],
      children: [
        {
          id: 'master-company',
          title: 'Company',
          icon: IconAffiliate,
          key: ['core.masterData'],
          children: [
            { id: 'company-org', title: 'Organization', icon: IconAffiliate, href: '/master/organization/' },
            { id: 'company-dept', title: 'Department', icon: IconAffiliate, href: '/master/department/' },
            { id: 'company-dist', title: 'District', icon: IconAffiliate, href: '/master/district/' },
          ],
        },
        {
          id: 'master-building',
          title: 'Building',
          icon: IconBuilding,
          key: ['core.masterData'],
          children: [
            { id: 'building-bld', title: 'Building', icon: IconBuilding, href: '/master/building/' },
            { id: 'building-flr', title: 'Floor', icon: IconMap, href: '/master/floor/' },
            { id: 'building-fp', title: 'Floor Plan', icon: IconMap, href: '/master/floorplan/' },
            {
              id: 'building-fp-masked',
              title: 'Floor Plan Masked Area',
              icon: IconCropLandscape,
              href: '/master/floorplanmaskedarea/',
            },
          ],
        },
        {
          id: 'master-devices',
          title: 'Devices',
          icon: IconDevices,
          key: ['core.masterData'],
          children: [
            { id: 'devices-brand', title: 'Brand', icon: IconBadgeTm, href: '/master/brand/' },
            { id: 'devices-reader', title: 'Ble Reader', icon: IconDeviceIpad, href: '/master/blereader/' },
            { id: 'devices-mapping', title: 'Device Mapping', icon: IconDevices, href: '/master/device/' },
          ],
        },
        {
          id: 'master-card',
          title: 'Card',
          icon: IconMapPin,
          key: ['core.masterData'],
          children: [
            { id: 'card-card', title: 'Card', icon: IconMapPin, href: '/master/card/' },
            { id: 'card-access', title: 'Card Access', icon: IconMapPin, href: '/master/cardaccess/' },
          ],
        },
        {
          id: 'master-security',
          title: 'Security',
          icon: IconEye,
          children: [
            { id: 'sec-guard', title: 'Security Guard', icon: IconBadge, href: '/master/securityguard/' },
            {
              id: 'sec-area',
              title: 'Patrol Area',
              icon: IconMapSearch,
              href: '/master/patrolarea/',
              key: ['module.patrol'],
            },
            {
              id: 'sec-route',
              title: 'Patrol Route',
              icon: IconRoute,
              href: '/master/patrolroute/',
              key: ['module.patrol'],
            },
          ],
        },
        {
          id: 'master-member',
          title: 'Member Data',
          icon: IconUsers,
          href: '/master/membertag/',
          key: ['core.masterData'],
        },
        {
          id: 'master-timegroup',
          title: 'Time Group',
          icon: IconCalendar,
          href: '/master/timegroup/',
          key: ['core.masterData'],
        },
        {
          id: 'master-users',
          title: 'Users',
          icon: IconMapPin,
          href: '/master/user/',
          key: ['core.masterData'],
        },
        {
          id: 'master-engine',
          title: 'Engine',
          icon: IconMapPin,
          href: '/master/engine/',
          key: ['core.masterData'],
        },
        {
          id: 'master-app',
          title: 'Application',
          icon: IconAppWindow,
          href: '/master/application/',
        },
      ],
    },

    {
      id: 'nav-alarm-settings',
      title: 'Alarm Settings',
      icon: IconBell,
      href: '/alarmsetting/',
      key: ['module.alarm'],
      children: [
        {
          id: 'alarm-setting-main',
          title: 'Alarm Setting',
          icon: IconBell,
          href: '/alarmsetting/',
          key: ['module.alarm'],
        },
        ...(isGeoFencingActive
          ? [
              {
                id: 'alarm-geofence',
                title: 'GeoFencing Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/geofencing/',
                key: ['module.alarm.geofence'],
              },
            ]
          : []),
        ...(isOverPopulatingActive
          ? [
              {
                id: 'alarm-overpop',
                title: 'OverPopulating Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/overpopulating/',
                key: ['module.alarm.overpopulating'],
              },
            ]
          : []),
        ...(isStayOnAreaActive
          ? [
              {
                id: 'alarm-stayonarea',
                title: 'Stay On Area Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/stayonarea/',
                key: ['module.alarm.stayOnArea'],
              },
            ]
          : []),
        ...(isBoundaryActive
          ? [
              {
                id: 'alarm-boundary',
                title: 'Boundary Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/boundary/',
                key: ['module.alarm.boundary'],
              },
            ]
          : []),
      ],
    },

    {
      id: 'nav-visitor',
      title: 'Visitor',
      icon: IconMapPin,
      href: '/visitor/',
      key: ['core.masterData'],
      children: [
        {
          id: 'visitor-data',
          title: 'Visitor Data',
          icon: IconMapPin,
          href: '/visitor/visitordata/',
          key: ['core.masterData'],
        },
        {
          id: 'visitor-invitation',
          title: 'Visitor Invitation',
          icon: IconMapPin,
          href: '/visitor/visitorinvitation/',
          key: ['core.masterData'],
        },
      ],
    },

    {
      id: 'nav-alarm-list',
      title: 'Alarm List',
      icon: IconBellExclamation,
      href: '/alarm/alarmlist/',
      key: ['module.alarm'],
    },

    {
      id: 'nav-report',
      title: 'Report',
      icon: IconApps,
      href: '/report/',
      children: [
        {
          id: 'report-visitor',
          title: 'Visitor Report',
          icon: IconCalendar,
          href: '/report/visitorreport/filter/',
          key: ['core.reporting', 'core.monitoring'],
        },
        {
          id: 'report-investigate',
          title: 'Investigate',
          icon: IconCalendar,
          href: '/report/investigate',
          key: ['core.reporting', 'core.monitoring'],
        },
        {
          id: 'report-eventlog',
          title: 'Event Log',
          icon: IconCalendar,
          href: '/report/eventlog',
          key: ['core.reporting', 'core.monitoring'],
        },
        {
          id: 'report-cardhistory',
          title: 'Card History',
          icon: IconCards,
          href: '/report/cardhistory',
          key: ['core.reporting', 'core.monitoring'],
        },
        {
          id: 'report-patrol',
          title: 'Patrol Report',
          icon: IconCalendar,
          href: '/report/patrolreport/',
          key: ['module.patrol'],
        },
        {
          id: 'report-movement',
          title: 'Movement Log',
          icon: IconCalendar,
          href: '/report/movementlog/',
          key: ['core.reporting', 'core.monitoring'],
        },
        {
          id: 'report-reader',
          title: 'Reader Report',
          icon: IconCalendar,
          href: '/report/readerreport/',
          key: ['core.reporting', 'core.monitoring'],
        },
        {
          id: 'report-reader-health',
          title: 'Reader Health Report',
          icon: IconCalendar,
          href: '/report/readerhealthreport/',
          key: ['core.reporting', 'core.monitoring'],
        },
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
  const filterMenu = (items: MenuItemType[]): MenuItemType[] =>
    items
      .map((item) => {
        // 🔹 License feature key check
        const hasFeature =
          !item.key ||
          (Array.isArray(activeFeatures) && item.key.some((k: string) => activeFeatures.includes(k)));

        if (!hasFeature) return null;

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
      .filter((item): item is MenuItemType => Boolean(item));

  return filterMenu(Menuitems);
};

/**
 * 🔹 Transforms the centralized menu into the Vertical Sidebar format with section subheaders
 */
export const useVerticalMenuItems = (alarmSettings: AlarmSettingType[]): MenuItemType[] => {
  const horizontalItems = useMenuItems(alarmSettings);

  const verticalItems: MenuItemType[] = [];

  horizontalItems.forEach((section) => {
    if (section.children && section.children.length > 0) {
      // Add section subheader (DASHBOARD, MASTER, etc.)
      verticalItems.push({
        id: `header-${section.id || section.title}`,
        navlabel: true,
        subheader: section.title,
      });
      // Add all immediate children under this section
      section.children.forEach((child) => {
        verticalItems.push(child);
      });
    } else {
      // Direct standalone item (e.g. Alarm List)
      verticalItems.push(section);
    }
  });

  return verticalItems;
};

export default useMenuItems;

