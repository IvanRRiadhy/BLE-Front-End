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
import { uniqueId } from 'lodash';
import { AlarmSettingType } from 'src/store/apps/alarmsetting/alarmSettings';
import { RootState, useSelector } from 'src/store/Store';

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
const activeFeatures = useSelector((state: RootState) => state.sessionReducer.activeFeatures);
console.log("active features: ", activeFeatures)

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
          title: 'Main Menu', //Pasti Ada
          icon: IconHome,
          href: '/dashboards/newmainmenu',
        },
        {
          id: uniqueId(),
          title: 'Monitoring', // Monitoring Dashboard
          icon: IconDeviceDesktopAnalytics,
          href: '/dashboards/monitoring/viewer',
          key:['core.monitoring', 'core.tracking'],
          children: [
            {
              id: uniqueId(),
              title: 'Viewer', // Monitoring Dashboard 
              icon: IconPoint,
              key:['core.monitoring', 'core.tracking'],
              href: '/dashboards/monitoring/viewer',
            },
            {
              id: uniqueId(),
              title: 'Configuration', // Monitoring Dashboard
              icon: IconPoint,
              key:['core.monitoring', 'core.tracking'],
              href: '/dashboards/monitoring/config',
            },
          ],
        },
        {
          id: uniqueId(), 
          title: "Evacuate --(WIP)--", //Evacuation Management
          icon: IconMapPin, 
          key: ['module.evacuation'],
          href: "/dashboards/evacuation"
        },
      ],
    },

    {
      id: uniqueId(),
      title: 'Master', //Master Data Management
      icon: IconAppWindow,
      href: '/master/',
      key:['core.masterData'],
      children: [
        {
          id: uniqueId(),
          title: 'Company',//Master Data Management
          icon: IconAffiliate,
          key:['core.masterData'],
          children: [
            { id: uniqueId(), title: 'Organization', icon: IconAffiliate, href: '/master/organization/' },
            { id: uniqueId(), title: 'Department', icon: IconAffiliate, href: '/master/department/' },
            { id: uniqueId(), title: 'District', icon: IconAffiliate, href: '/master/district/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Building', //Master Data Management
          icon: IconBuilding,
          key: ['core.masterData'],
          children: [
            { id: uniqueId(), title: 'Building', icon: IconBuilding, href: '/master/building/' },
            { id: uniqueId(), title: 'Floor', icon: IconMap, href: '/master/floor/' },
            { id: uniqueId(), title: 'Floor Plan', icon: IconMap, href: '/master/floorplan/' },
            { id: uniqueId(), title: 'Floor Plan Masked Area', icon: IconCropLandscape, href: '/master/floorplanmaskedarea/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Devices', //Master Data Management
          icon: IconDevices,
          key: ['core.masterData'],
          children: [
            { id: uniqueId(), title: 'Brand', icon: IconBadgeTm, href: '/master/brand/' },

            { id: uniqueId(), title: 'Ble Reader', icon: IconDeviceIpad, href: '/master/blereader/' },
            { id: uniqueId(), title: 'Device Mapping', icon: IconDevices, href: '/master/device/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Card', //Master Data Management
          icon: IconMapPin,
          key: ['core.masterData'],
          children: [
            { id: uniqueId(), title: 'Card', icon: IconMapPin, href: '/master/card/' },
            { id: uniqueId(), title: 'Card Access', icon: IconMapPin, href: '/master/cardaccess/' },
          ],
        },
        {
          id: uniqueId(),
          title: 'Security', 
          icon: IconEye,
          children: [
            { id: uniqueId(), title: 'Security Guard', icon: IconBadge, href: '/master/securityguard/' },
            { id: uniqueId(), title: 'Patrol Area', icon: IconMapSearch, href: '/master/patrolarea/', key: ['module.patrol'] }, //Patrol Management
            { id: uniqueId(), title: 'Patrol Route', icon: IconRoute, href: '/master/patrolroute/', key: ['module.patrol'] }, //Patrol Management
          ]
        },
        { id: uniqueId(), title: 'Member Data', icon: IconUsers, href: '/master/membertag/', key: ['core.masterData'] }, //Master Data Management
        { id: uniqueId(), title: 'Time Group', icon: IconCalendar, href: '/master/timegroup/', key: ['core.masterData'] }, //Master Data Management
        { id: uniqueId(), title: 'Users', icon: IconMapPin, href: '/master/user/', key: ['core.masterData'] }, //Master Data Management
        { id: uniqueId(), title: 'Engine', icon: IconMapPin, href: '/master/engine/', key: ['core.masterData'] }, //Master Data Management
        { id: uniqueId(), title: 'Application', icon: IconAppWindow, href: '/master/application/' },
      ],
    },

    {
      id: uniqueId(),
      title: 'Alarm Settings',
      icon: IconBell,
      href: '/alarmsetting/',
      key: ['module.alarm'],
      children: [
        { id: uniqueId(), title: 'Alarm Setting', icon: IconBell, href: '/alarmsetting/', key: ['module.alarm'] }, //Alarm Module
        ...(isGeoFencingActive
          ? [{ id: uniqueId(), title: 'GeoFencing Alarm', icon: IconBellExclamation, href: '/alarmsetting/geofencing/', key: ['module.alarm.geofence'] }] //Advanced Alarm : Geofence
          : []),
        ...(isOverPopulatingActive
          ? [{ id: uniqueId(), title: 'OverPopulating Alarm', icon: IconBellExclamation, href: '/alarmsetting/overpopulating/', key: ['module.alarm.overpopulating'] }]//Advanced Alarm : Over Populating
          : []),
        ...(isStayOnAreaActive
          ? [{ id: uniqueId(), title: 'Stay On Area Alarm', icon: IconBellExclamation, href: '/alarmsetting/stayonarea/', key: ['module.alarm.stayOnArea'] }]//Advanced Alarm : Stay On Area 
          : []),
        ...(isBoundaryActive
          ? [{ id: uniqueId(), title: 'Boundary Alarm', icon: IconBellExclamation, href: '/alarmsetting/boundary/', key: ['module.alarm.boundary'] }] //Advanced Alarm : Boundary
          : []),
      ],
    },

    {
      id: uniqueId(),
      title: 'Visitor', //Master Data Management
      icon: IconMapPin,
      href: '/visitor/',
      key: ['core.masterData'],
      children: [
        { id: uniqueId(), title: 'Visitor Data', icon: IconMapPin, href: '/visitor/visitordata/', key: ['core.masterData'] }, //Master Data Management
        { id: uniqueId(), title: 'Visitor Invitation', icon: IconMapPin, href: '/visitor/visitorinvitation/', key: ['core.masterData'] }, //Master Data Management
      ],
    },
    { id: uniqueId(), title: 'Alarm List', icon: IconBellExclamation, href: '/alarm/alarmlist/', key: ['module.alarm'] }, //Alarm Module
    {
      id: uniqueId(),
      title: 'Report',
      icon: IconApps,
      href: '/report/',
      children: [
        { id: uniqueId(), title: 'Visitor Report', icon: IconCalendar, href: '/report/visitorreport/filter/', key: ['core.reporting', 'core.monitoring'] }, //Reports & Analytics & Monitoring Dashboard
        { id: uniqueId(), title: 'Investigate', icon: IconCalendar, href: '/report/investigate', key: ['core.reporting', 'core.monitoring'] },//Reports & Analytics & Monitoring Dashboard
        { id: uniqueId(), title: 'Event Log', icon: IconCalendar, href: '/report/eventlog', key: ['core.reporting', 'core.monitoring'] }, //Reports & Analytics & Monitoring Dashboard
        { id: uniqueId(), title: 'Card History', icon: IconCards, href: '/report/cardhistory' }, 
        { id: uniqueId(), title: 'Patrol Report', icon: IconCalendar, href: '/report/patrolreport/', key: ['module.patrol'] }, //Patrol Management
        { id: uniqueId(), title: 'Movement Log', icon: IconCalendar, href: '/report/movementlog/', key: ['core.reporting', 'core.monitoring'] }, //Reports & Analytics & Monitoring Dashboard
        { id: uniqueId(), title: 'Reader Report', icon: IconCalendar, href: '/report/readerreport/', key: ['core.reporting', 'core.monitoring'] }, //Reports & Analytics & Monitoring Dashboard
        { id: uniqueId(), title: 'Reader Health Report', icon: IconCalendar, href: '/report/readerhealthreport/', key: ['core.reporting', 'core.monitoring'] },//Reports & Analytics & Monitoring Dashboard
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
      .filter(Boolean);

  const filteredMenu = filterMenu(Menuitems);
  return filteredMenu;
};

export default useMenuItems;
