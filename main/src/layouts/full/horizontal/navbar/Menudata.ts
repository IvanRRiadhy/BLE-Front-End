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
import { useSelector } from 'react-redux';

const useMenuItems = () => {
  const alarmSettings = useSelector((state: any) => state.AlarmSettingReducer.alarmSettings);

  const isGeoFencingActive = alarmSettings.some(
    (a: any) => a.alarmCategory.toLowerCase() === "geofencing" && a.isEnabled
  );
  const isPeopleCountingActive = alarmSettings.some(
    (a: any) => a.alarmCategory.toLowerCase() === "people counting" && a.isEnabled
  );
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
        //chip: 'New',
        //chipColor: 'secondary',
      },
      {
        id: uniqueId(),
        title: 'Monitoring',
        icon: IconDeviceDesktopAnalytics,
        href: '/dashboards/monitoring/viewer',
        children:[
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
        ]
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
      {
        id: uniqueId(),
        title: 'Organization',
        icon: IconAffiliate,
        href: '/master/organization/'
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
        href: '/master/district/'
      },
    ]
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
        href: '/master/floor/'
      },
            {
        id: uniqueId(),
        title: 'Floor Plan',
        icon: IconMap,
        href: '/master/floorplan/'
      },
      {
        id: uniqueId(),
        title: 'Floor Plan Masked Area',
        icon: IconCropLandscape,
        href: '/master/floorplanmaskedarea/'
      },
    ]
  },

  // {
  //   id: uniqueId(),
  //   title: 'Floor Plan',
  //   icon: IconMap,
  //   href: '/master/floorplan/',
  //   children: [


  //   ]
  // },
  {
    id: uniqueId(),
    title: 'Devices',
    icon: IconDevices,
    children: [
            {
        id: uniqueId(),
        title: 'Brand',
        icon: IconBadgeTm,
        href: '/master/brand/'
      },
      {
        id: uniqueId(),
        title: 'Access CCTV',
        icon: IconDeviceCctv,
        href: '/master/accesscctv/'
      },
      {
        id: uniqueId(),
        title: 'Access Control --(WIP)--',
        icon: IconIdBadge,
        href: '/master/accesscontrol/'
      },
            {
        id: uniqueId(),
        title: 'Ble Reader',
        icon: IconDeviceIpad,
        href: '/master/blereader/'
      },
                  {
        id: uniqueId(),
        title: 'Device Mapping',
        icon: IconDevices,
        href: '/master/device/'
      },
    ]
  },
      {
        id: uniqueId(),
        title: 'Card',
        icon: IconMapPin,
        // href: '/master/card',
        children: [
          {
            id: uniqueId(),
            title: 'Card',
            icon: IconMapPin,
            href: '/master/card/'
          },
          {
            id: uniqueId(),
            title: 'Card Group',
            icon: IconMapPin,
            href: '/master/cardgroup/'
          },
          {
            id: uniqueId(),
            title: 'Card Access',
            icon: IconMapPin,
            href: '/master/cardaccess/'
          },
        ]
      },
            {
        id:uniqueId(),
        title: 'Member Data',
        icon: IconMapPin,
        href: '/master/membertag/'
      },
      {
        id:uniqueId(),
        title: 'Time Group',
        icon: IconCalendar,
        href: '/master/timegroup/'
      },
    // {
    //   id: uniqueId(),
    //   title: 'Application',
    //   icon: IconMap,
    //   href: '/master/application/',
    // },
    {
        id:uniqueId(),
        title: 'Integration  --(WIP)--',
        icon: IconLicense,
        href: '/master/integration/'
      },


      {
        id: uniqueId(),
        title: 'Users  --(WIP)--',
        icon: IconMapPin,
        href: '/master/user/'
      },


    ],
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
                title: "GeoFencing Alarm",
                icon: IconBellExclamation,
                href: "/alarmsetting/geofencing/",
              },
            ]
          : []),
      ...(isPeopleCountingActive
          ? [
              {
                id: uniqueId(),
                title: "People Counting Alarm",
                icon: IconBellExclamation,
                href: "/alarmsetting/peoplecounting/",
              },
            ]
          : []),
    ]
  },
    {
    id: uniqueId(),
    title: 'Visitor',
    icon: IconMapPin,
    href: '/visitor/',
    children: [

            {
        id:uniqueId(),
        title: 'Visitor Data',
        icon: IconMapPin,
        href: '/visitor/visitordata/'
      },
      {
        id:uniqueId(),
        title: 'Visitor Invitation',
        icon: IconMapPin,
        href: '/visitor/visitorinvitation/'
      },
            {
        id: uniqueId(),
        title: 'Blacklist',
        icon: IconBarrierBlock,
        href: '/visitor/blacklist/',
      },
    ]
  },
  {
    id: uniqueId(),
    title: 'Report',
    icon: IconApps,
    href: '/report/',
    children: [
            {
        id: uniqueId(),
        title: 'Tracking Transaction',
        icon: IconLiveView,
        href: '/report/trackingtransaction/'
      },
      {
        id: uniqueId(),
        title: 'Alarm Notification',
        icon: IconBellExclamation,
        href: '/report/alarmRecord/',
      },
            {
        id: uniqueId(),
        title: 'Alarm Triger',
        icon: IconBellExclamation,
        href: '/report/alarmTrigger/',
      },
      {
        id: uniqueId(),
        title: 'Card Record',
        icon: IconBarrierBlock,
        href: '/report/cardrecord/',
      },

      // {
      //   id: uniqueId(),
      //   title: 'Login',
      //   icon: IconPoint,
      //   href: '/auth/login/',
      // },
  //     {
  //       id: uniqueId(),
  //       title: 'Area Access',
  //       icon: IconMapCheck,
  //       href: '/report/friends',
  //     },
  //     {
  //             id: uniqueId(),
  //             title: 'Auth',
  //             icon: IconPoint,
  //             href: '/400',
  //             children: [
  //               {
  //                 id: uniqueId(),
  //                 title: 'Error',
  //                 icon: IconAlertCircle,
  //                 href: '/400',
  //               },
  //               {
  //                 id: uniqueId(),
  //                 title: 'Maintenance',
  //                 icon: IconSettings,
  //                 href: '/auth/maintenance',
  //               },
  //               {
  //                 id: uniqueId(),
  //                 title: 'Login',
  //                 icon: IconLogin,
  //                 href: '/auth/login',
  //                 children: [
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Side Login',
  //                     icon: IconPoint,
  //                     href: '/auth/login',
  //                   },
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Boxed Login',
  //                     icon: IconPoint,
  //                     href: '/auth/login2',
  //                   },
  //                 ],
  //               },
  //               {
  //                 id: uniqueId(),
  //                 title: 'Register',
  //                 icon: IconUserPlus,
  //                 href: '/auth/register',
  //                 children: [
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Side Register',
  //                     icon: IconPoint,
  //                     href: '/auth/register',
  //                   },
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Boxed Register',
  //                     icon: IconPoint,
  //                     href: '/auth/register2',
  //                   },
  //                 ],
  //               },
  //               {
  //                 id: uniqueId(),
  //                 title: 'Forgot Password',
  //                 icon: IconRotate,
  //                 href: '/auth/forgot-password',
  //                 children: [
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Side Forgot Password',
  //                     icon: IconPoint,
  //                     href: '/auth/forgot-password',
  //                   },
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Boxed Forgot Password',
  //                     icon: IconPoint,
  //                     href: '/auth/forgot-password2',
  //                   },
  //                 ],
  //               },
  //               {
  //                 id: uniqueId(),
  //                 title: 'Two Steps',
  //                 icon: IconZoomCode,
  //                 href: '/auth/two-steps',
  //                 children: [
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Side Two Steps',
  //                     icon: IconPoint,
  //                     href: '/auth/two-steps',
  //                   },
  //                   {
  //                     id: uniqueId(),
  //                     title: 'Boxed Two Steps',
  //                     icon: IconPoint,
  //                     href: '/auth/two-steps2',
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
    ],
  },
  {
    id: uniqueId(),
    title: 'My Visit',
    icon: IconUsers,
    href: '/my-visit/',
  }
];
return Menuitems;
}


export default useMenuItems;
