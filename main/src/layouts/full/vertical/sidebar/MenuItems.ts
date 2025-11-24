import { uniqueId } from 'lodash';
import {
  IconHome,
  IconPoint,
  IconAppWindow,
  IconDeviceDesktopAnalytics,
  IconBuilding,
  IconMap,
  IconBellExclamation,
  IconLicense,
  IconLiveView,
  IconBarrierBlock,
  IconCropLandscape,
  IconDevices,
  IconDeviceCctv,
  IconIdBadge,
  IconDeviceIpad,
  IconBadgeTm,
  IconAffiliate,
  IconMapPin,
  IconCalendar,
  IconBell,
  IconUsers,
} from '@tabler/icons-react';
import { AlarmSettingType } from 'src/store/apps/alarmsetting/alarmSettings';

interface MenuitemsType {
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}

/**
 * Returns full menu items (static + dynamic alarm menus)
 */
const getMenuItems = (alarmSettings: AlarmSettingType[]): MenuitemsType[] => {
  const isGeoFencingActive = alarmSettings?.some(
    (a) => a.alarmCategory.toLowerCase() === 'geofence' && a.isEnabled,
  ) || false;
  const isOverPopulatingActive = alarmSettings?.some(
    (a) => a.alarmCategory.toLowerCase() === 'overpopulating' && a.isEnabled,
  ) || false;
  const isStayOnAreaActive = alarmSettings?.some(
    (a) => a.alarmCategory.toLowerCase() === 'stayonarea' && a.isEnabled,
  ) || false;
  const isBoundaryActive = alarmSettings?.some(
    (a) => a.alarmCategory.toLowerCase() === 'boundary' && a.isEnabled,
  ) || false;


  const Menuitems: MenuitemsType[] = [
    {
      navlabel: true,
      subheader: 'Dashboard',
    },
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
      href: '/dashboards/monitoring/',
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

    {
      navlabel: true,
      subheader: 'Master',
    },
    {
      id: uniqueId(),
      title: 'Company',
      icon: IconAffiliate,
      children: [
        {
          id: uniqueId(),
          title: 'Organization',
          icon: IconAffiliate,
          href: '/master/organization/',
        },
        {
          id: uniqueId(),
          title: 'Department',
          icon: IconAffiliate,
          href: '/master/department/',
        },
        {
          id: uniqueId(),
          title: 'District',
          icon: IconAffiliate,
          href: '/master/district/',
        },
      ],
    },
    {
      id: uniqueId(),
      title: 'Building',
      icon: IconBuilding,
      children: [
        {
          id: uniqueId(),
          title: 'Building',
          icon: IconBuilding,
          href: '/master/building/',
        },
        {
          id: uniqueId(),
          title: 'Floor',
          icon: IconMap,
          href: '/master/floor/',
        },
        {
          id: uniqueId(),
          title: 'Floor Plan',
          icon: IconMap,
          href: '/master/floorplan/',
        },
        {
          id: uniqueId(),
          title: 'Floor Plan Masked Area',
          icon: IconCropLandscape,
          href: '/master/floorplanmaskedarea/',
        },
      ],
    },
    {
      id: uniqueId(),
      title: 'Devices',
      icon: IconDevices,
      children: [
        {
          id: uniqueId(),
          title: 'Brand',
          icon: IconBadgeTm,
          href: '/master/brand/',
        },
        // {
        //   id: uniqueId(),
        //   title: 'Access CCTV',
        //   icon: IconDeviceCctv,
        //   href: '/master/accesscctv/',
        // },
        // {
        //   id: uniqueId(),
        //   title: 'Access Control --(WIP)--',
        //   icon: IconIdBadge,
        //   href: '/master/accesscontrol/',
        // },
        {
          id: uniqueId(),
          title: 'Ble Reader',
          icon: IconDeviceIpad,
          href: '/master/blereader/',
        },
        {
          id: uniqueId(),
          title: 'Device Mapping',
          icon: IconDevices,
          href: '/master/device/',
        },
      ],
    },
    {
      id: uniqueId(),
      title: 'Card',
      icon: IconMapPin,
      children: [
        {
          id: uniqueId(),
          title: 'Card',
          icon: IconMapPin,
          href: '/master/card/',
        },
        {
          id: uniqueId(),
          title: 'Card Group',
          icon: IconMapPin,
          href: '/master/cardgroup/',
        },
        {
          id: uniqueId(),
          title: 'Card Access',
          icon: IconMapPin,
          href: '/master/cardaccess/',
        },
      ],
    },
    {
      id: uniqueId(),
      title: 'Member Data',
      icon: IconUsers,
      href: '/master/membertag/',
    },
    {
      id: uniqueId(),
      title: 'Time Group',
      icon: IconCalendar,
      href: '/master/timegroup/',
    },
    // {
    //   id: uniqueId(),
    //   title: 'Integration --(WIP)--',
    //   icon: IconLicense,
    //   href: '/master/integration/',
    // },
    // {
    //   id: uniqueId(),
    //   title: 'Users --(WIP)--',
    //   icon: IconUsers,
    //   href: '/master/user/',
    // },

    {
      navlabel: true,
      subheader: 'Alarm Settings',
    },
    {
      id: uniqueId(),
      title: 'Alarm Settings',
      icon: IconBell,
      href: '/alarmsetting/',
      children: [
        {
          id: uniqueId(),
          title: 'Alarm Setting',
          icon: IconBell,
          href: '/alarmsetting/',
        },
        ...(isGeoFencingActive
          ? [
              {
                id: uniqueId(),
                title: 'GeoFencing Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/geofencing/',
              },
            ]
          : []),
        ...(isOverPopulatingActive
          ? [
              {
                id: uniqueId(),
                title: 'OverPopulating Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/overpopulating/',
              },
            ]
          : []),
        ...(isStayOnAreaActive
          ? [
              {
                id: uniqueId(),
                title: 'Stay On Area Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/stayonarea/',
              },
            ]
          : []),
        ...(isBoundaryActive
          ? [
              {
                id: uniqueId(),
                title: 'Boundary Alarm',
                icon: IconBellExclamation,
                href: '/alarmsetting/boundary/',
              },
            ]
          : []),
      ],
    },

    {
      navlabel: true,
      subheader: 'Visitor',
    },
    {
      id: uniqueId(),
      title: 'Visitor',
      icon: IconMapPin,
      href: '/visitor/',
      children: [
        {
          id: uniqueId(),
          title: 'Visitor Data',
          icon: IconMapPin,
          href: '/visitor/visitordata/',
        },
        {
          id: uniqueId(),
          title: 'Visitor Invitation',
          icon: IconMapPin,
          href: '/visitor/visitorinvitation/',
        },
        // {
        //   id: uniqueId(),
        //   title: 'Blacklist',
        //   icon: IconBarrierBlock,
        //   href: '/visitor/blacklist/',
        // },
      ],
    },

    {
      navlabel: true,
      subheader: 'Report',
    },
    // {
    //   id: uniqueId(),
    //   title: 'Tracking Transaction',
    //   icon: IconLiveView,
    //   href: '/report/trackingtransaction/',
    // },
    // {
    //   id: uniqueId(),
    //   title: 'Alarm Notification',
    //   icon: IconBellExclamation,
    //   href: '/report/alarmRecord/',
    // },
    {
      id: uniqueId(),
      title: 'Alarm Trigger',
      icon: IconBellExclamation,
      href: '/report/alarmTrigger/',
    },
    {
      id: uniqueId(),
      title: 'Card Record',
      icon: IconBarrierBlock,
      href: '/report/cardrecord/',
    },
  ];

  return Menuitems;
};

export default getMenuItems;
