import {
  IconHome,
  IconPoint,
  IconApps,
  IconClipboard,
  IconFileDescription,
  IconBorderAll,
  IconZoomCode,
  IconRotate,
  IconUserPlus,
  IconLogin,
  IconAlertCircle,
  IconSettings,
  IconAppWindow,
  IconListTree,
  IconChartHistogram,
  IconDeviceDesktopAnalytics,
  IconBuilding,
  IconMap2,
  IconDeviceIpadExclamation,
  IconMap,
  IconFlag3,
  IconAccessible,
  IconBellExclamation,
  IconLicense,
  IconFile,
  IconMapDown,
  IconAccessibleOff,
  IconLiveView,
  IconAccessibleOffFilled,
  IconLicenseOff,
  IconUserCircle,
  IconBarrierBlock,
  IconMapCheck,
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';

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
        href: '/dashboards/monitoring',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Master',
    icon: IconAppWindow,
    children: [
  {
    id: uniqueId(),
    title: 'Building',
    icon: IconBuilding,
    href: '/master/building',
  },
  {
    id: uniqueId(),
    title: 'Organization',
    icon: IconMapDown,
    children: [
      {
        id: uniqueId(),
        title: 'Organization',
        icon: IconMap,
        href: '/master/organization'
      },
      {
        id: uniqueId(),
        title: 'Department',
        icon: IconMap,
        href: '/master/department',
      },
      {
        id: uniqueId(),
        title: 'District',
        icon: IconMap,
        href: '/master/district'
      },
    ]
  },
  {
    id: uniqueId(),
    title: 'Floor Plan',
    icon: IconMap2,
    href: '/master/floorplan',
  },
  {
    id: uniqueId(),
    title: 'Masking Area',
    icon: IconDeviceIpadExclamation,
    href: '/apps/chats',
  },
  {
    id: uniqueId(),
    title: 'Tag',
    icon: IconMap,
    children: [
      {
        id:uniqueId(),
        title: 'Member',
        icon: IconAccessible,
        href: '/master/membertag'
      },
      {
        id:uniqueId(),
        title: 'Visitor',
        icon: IconAccessibleOff,
        href: '/master/visitortag'
      },
    ]
  },
  {
    id: uniqueId(),
    title: 'Gateway',
    icon: IconFlag3,
    href: '/master/gateway',
  },
  {
    id: uniqueId(),
    title: 'Role Access',
    icon: IconAccessible,
    href: '/frontend-pages/contact',
  },
  {
    id: uniqueId(),
    title: 'Alarm',
    icon: IconBellExclamation,
    href: '/apps/notes/',
  },
    {
      id: uniqueId(),
      title: 'Guest Permission',
      icon: IconLicense,
      href: '/apps/tickets/',
    },
    ],
  },
  {
    id: uniqueId(),
    title: 'Apps',
    icon: IconApps,
    href: '/apps/',
    children: [
      {
        id: uniqueId(),
        title: 'Live Tracking',
        icon: IconLiveView,
        href: '/apps/tracking/',
      },
      {
        id: uniqueId(),
        title: 'Alarm Notification',
        icon: IconBellExclamation,
        href: '/apps/kanban/',
      },
      {
        id: uniqueId(),
        title: 'People Track',
        icon: IconUserCircle,
        href: '/user-profile',
      },
      {
        id: uniqueId(),
        title: 'Blacklist',
        icon: IconBarrierBlock,
        href: '/apps/followers',
      },
      {
        id: uniqueId(),
        title: 'Area Access',
        icon: IconMapCheck,
        href: '/apps/friends',
      },
      {
              id: uniqueId(),
              title: 'Auth',
              icon: IconPoint,
              href: '/400',
              children: [
                {
                  id: uniqueId(),
                  title: 'Error',
                  icon: IconAlertCircle,
                  href: '/400',
                },
                {
                  id: uniqueId(),
                  title: 'Maintenance',
                  icon: IconSettings,
                  href: '/auth/maintenance',
                },
                {
                  id: uniqueId(),
                  title: 'Login',
                  icon: IconLogin,
                  href: '/auth/login',
                  children: [
                    {
                      id: uniqueId(),
                      title: 'Side Login',
                      icon: IconPoint,
                      href: '/auth/login',
                    },
                    {
                      id: uniqueId(),
                      title: 'Boxed Login',
                      icon: IconPoint,
                      href: '/auth/login2',
                    },
                  ],
                },
                {
                  id: uniqueId(),
                  title: 'Register',
                  icon: IconUserPlus,
                  href: '/auth/register',
                  children: [
                    {
                      id: uniqueId(),
                      title: 'Side Register',
                      icon: IconPoint,
                      href: '/auth/register',
                    },
                    {
                      id: uniqueId(),
                      title: 'Boxed Register',
                      icon: IconPoint,
                      href: '/auth/register2',
                    },
                  ],
                },
                {
                  id: uniqueId(),
                  title: 'Forgot Password',
                  icon: IconRotate,
                  href: '/auth/forgot-password',
                  children: [
                    {
                      id: uniqueId(),
                      title: 'Side Forgot Password',
                      icon: IconPoint,
                      href: '/auth/forgot-password',
                    },
                    {
                      id: uniqueId(),
                      title: 'Boxed Forgot Password',
                      icon: IconPoint,
                      href: '/auth/forgot-password2',
                    },
                  ],
                },
                {
                  id: uniqueId(),
                  title: 'Two Steps',
                  icon: IconZoomCode,
                  href: '/auth/two-steps',
                  children: [
                    {
                      id: uniqueId(),
                      title: 'Side Two Steps',
                      icon: IconPoint,
                      href: '/auth/two-steps',
                    },
                    {
                      id: uniqueId(),
                      title: 'Boxed Two Steps',
                      icon: IconPoint,
                      href: '/auth/two-steps2',
                    },
                  ],
                },
              ],
            },
    ],
  },
  {
    id: uniqueId(),
    title: 'CRUD',
    icon: IconPoint,
    children: [
      {
        id: uniqueId(),
        title: 'Application',
        icon: IconMap,
        href: '/master/application',
      },
      {
          id:uniqueId(),
          title: 'Integration',
          icon: IconLicense,
          href: '/master/integration'
        },
        {
          id: uniqueId(),
          title: 'Access CCTV',
          icon: IconAccessible,
          href: '/master/accesscctv'
        },
        {
          id: uniqueId(),
          title: 'Access Control',
          icon: IconAccessible,
          href: '/master/accesscontrol'
        },
        {
          id: uniqueId(),
          title: 'Brand',
          icon: IconBellExclamation,
          href: '/master/brand'
        },
        {
          id: uniqueId(),
          title: 'Department',
          icon: IconFile,
          href: '/master/department'
        },
        {
          id: uniqueId(),
          title: 'District',
          icon: IconMap2,
          href: '/master/district'
        },
        {
          id: uniqueId(),
          title: 'Organization',
          icon: IconBuilding,
          href: '/master/organization'
        },
        {
          id: uniqueId(),
          title: 'Floorplan Masked Area',
          icon: IconMapDown,
          href: '/master/floorplanmaskedarea'
        },
        {
          id: uniqueId(),
          title: 'Ble Reader',
          icon: IconLogin,
          href: '/master/blereader'
        },
        {
          id: uniqueId(),
          title: 'Floor',
          icon: IconMap,
          href: '/master/floor'
        },
        {
          id: uniqueId(),
          title: 'Member',
          icon: IconAccessibleOff,
          href: '/master/member'
        },
        {
          id: uniqueId(),
          title: 'Tracking Transaction',
          icon: IconLiveView,
          href: '/master/trackingtransaction'
        },
        {
          id: uniqueId(),
          title: 'Visitor',
          icon: IconAccessibleOffFilled,
          href: '/master/visitor'
        },
        {
          id: uniqueId(),
          title: 'Blacklist',
          icon: IconLicenseOff,
          href: '/master/blacklist'
        },
        {
          id: uniqueId(),
          title: 'Building',
          icon: IconBuilding,
          href: '/master/building'
        }
    ]
  },
  

  // {
  //   id: uniqueId(),
  //   title: 'Pages',
  //   icon: IconClipboard,
  //   href: '/ui-components/',
  //   children: [
  //     {
  //       id: uniqueId(),
  //       title: 'Pricing',
  //       icon: IconPoint,
  //       href: '/pages/pricing',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Account Setting',
  //       icon: IconPoint,
  //       href: '/pages/account-settings',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Landingpage',
  //       icon: IconPoint,
  //       href: '/landingpage',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'FAQ',
  //       icon: IconPoint,
  //       href: '/pages/faq',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Widgets',
  //       icon: IconPoint,
  //       href: '/widgets/cards',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Cards',
  //           icon: IconPoint,
  //           href: '/widgets/cards',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Banners',
  //           icon: IconPoint,
  //           href: '/widgets/banners',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Charts',
  //           icon: IconPoint,
  //           href: '/widgets/charts',
  //         },
  //       ],
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Ui',
  //       icon: IconPoint,
  //       href: '/ui-components/alert',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Alert',
  //           icon: IconPoint,
  //           href: '/ui-components/alert',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Accordion',
  //           icon: IconPoint,
  //           href: '/ui-components/accordion',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Avatar',
  //           icon: IconPoint,
  //           href: '/ui-components/avatar',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Chip',
  //           icon: IconPoint,
  //           href: '/ui-components/chip',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Dialog',
  //           icon: IconPoint,
  //           href: '/ui-components/dialog',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'List',
  //           icon: IconPoint,
  //           href: '/ui-components/list',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Popover',
  //           icon: IconPoint,
  //           href: '/ui-components/popover',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Rating',
  //           icon: IconPoint,
  //           href: '/ui-components/rating',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Tabs',
  //           icon: IconPoint,
  //           href: '/ui-components/tabs',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Tooltip',
  //           icon: IconPoint,
  //           href: '/ui-components/tooltip',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Transfer List',
  //           icon: IconPoint,
  //           href: '/ui-components/transfer-list',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Typography',
  //           icon: IconPoint,
  //           href: '/typography',
  //         },
  //       ],
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Charts',
  //       icon: IconPoint,
  //       href: '/charts/',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Line',
  //           icon: IconPoint,
  //           href: '/charts/line-chart',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Gredient',
  //           icon: IconPoint,
  //           href: '/charts/gredient-chart',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Area',
  //           icon: IconPoint,
  //           href: '/charts/area-chart',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Candlestick',
  //           icon: IconPoint,
  //           href: '/charts/candlestick-chart',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Column',
  //           icon: IconPoint,
  //           href: '/charts/column-chart',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Doughtnut & Pie',
  //           icon: IconPoint,
  //           href: '/charts/doughnut-pie-chart',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'RadialBar & Radar',
  //           icon: IconPoint,
  //           href: '/charts/radialbar-chart',
  //         },
  //       ],
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Auth',
  //       icon: IconPoint,
  //       href: '/400',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Error',
  //           icon: IconAlertCircle,
  //           href: '/400',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Maintenance',
  //           icon: IconSettings,
  //           href: '/auth/maintenance',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Login',
  //           icon: IconLogin,
  //           href: '/auth/login',
  //           children: [
  //             {
  //               id: uniqueId(),
  //               title: 'Side Login',
  //               icon: IconPoint,
  //               href: '/auth/login',
  //             },
  //             {
  //               id: uniqueId(),
  //               title: 'Boxed Login',
  //               icon: IconPoint,
  //               href: '/auth/login2',
  //             },
  //           ],
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Register',
  //           icon: IconUserPlus,
  //           href: '/auth/register',
  //           children: [
  //             {
  //               id: uniqueId(),
  //               title: 'Side Register',
  //               icon: IconPoint,
  //               href: '/auth/register',
  //             },
  //             {
  //               id: uniqueId(),
  //               title: 'Boxed Register',
  //               icon: IconPoint,
  //               href: '/auth/register2',
  //             },
  //           ],
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Forgot Password',
  //           icon: IconRotate,
  //           href: '/auth/forgot-password',
  //           children: [
  //             {
  //               id: uniqueId(),
  //               title: 'Side Forgot Password',
  //               icon: IconPoint,
  //               href: '/auth/forgot-password',
  //             },
  //             {
  //               id: uniqueId(),
  //               title: 'Boxed Forgot Password',
  //               icon: IconPoint,
  //               href: '/auth/forgot-password2',
  //             },
  //           ],
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Two Steps',
  //           icon: IconZoomCode,
  //           href: '/auth/two-steps',
  //           children: [
  //             {
  //               id: uniqueId(),
  //               title: 'Side Two Steps',
  //               icon: IconPoint,
  //               href: '/auth/two-steps',
  //             },
  //             {
  //               id: uniqueId(),
  //               title: 'Boxed Two Steps',
  //               icon: IconPoint,
  //               href: '/auth/two-steps2',
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  // },
  // {
  //   id: uniqueId(),
  //   title: 'Forms',
  //   icon: IconFileDescription,
  //   href: '/forms/form-elements/autocomplete',
  //   children: [
  //     {
  //       id: uniqueId(),
  //       title: 'Form Elements',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/autocomplete',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Autocomplete',
  //           icon: IconPoint,
  //           href: '/forms/form-elements/autocomplete',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Button',
  //           icon: IconPoint,
  //           href: '/forms/form-elements/button',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Radio',
  //           icon: IconPoint,
  //           href: '/forms/form-elements/radio',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Date Time',
  //           icon: IconPoint,
  //           href: '/forms/form-elements/date-time',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Slider',
  //           icon: IconPoint,
  //           href: '/forms/form-elements/slider',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Switch',
  //           icon: IconPoint,
  //           href: '/forms/form-elements/switch',
  //         },
  //       ],
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Form Layout',
  //       icon: IconPoint,
  //       href: '/forms/form-layouts',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Form Horizontal',
  //       icon: IconPoint,
  //       href: '/forms/form-horizontal',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Form Vertical',
  //       icon: IconPoint,
  //       href: '/forms/form-vertical',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Form Custom',
  //       icon: IconPoint,
  //       href: '/forms/form-custom',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Form Wizard',
  //       icon: IconPoint,
  //       href: '/forms/form-wizard',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Form Validation',
  //       icon: IconPoint,
  //       href: '/forms/form-validation',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Tiptap Editor',
  //       icon: IconPoint,
  //       href: '/forms/form-tiptap',
  //     },
  //   ],
  // },
  // {
  //   id: uniqueId(),
  //   title: 'Tables',
  //   icon: IconBorderAll,
  //   href: '/tables/',
  //   children: [
  //     {
  //       id: uniqueId(),
  //       title: 'Basic',
  //       icon: IconPoint,
  //       href: '/tables/basic',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Collapsible',
  //       icon: IconPoint,
  //       href: '/tables/collapsible',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Enhanced',
  //       icon: IconPoint,
  //       href: '/tables/enhanced',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Fixed Header',
  //       icon: IconPoint,
  //       href: '/tables/fixed-header',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Pagination',
  //       icon: IconPoint,
  //       href: '/tables/pagination',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Search',
  //       icon: IconPoint,
  //       href: '/tables/search',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'React Table',
  //       icon: IconPoint,
  //       href: '/react-tables/basic',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Basic',
  //           icon: IconPoint,
  //           href: '/react-tables/basic',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Dense',
  //           icon: IconPoint,
  //           href: '/react-tables/dense',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Filter',
  //           icon: IconPoint,
  //           href: '/react-tables/filter',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Row Selection',
  //           icon: IconPoint,
  //           href: '/react-tables/row-selection',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Pagination',
  //           icon: IconPoint,
  //           href: '/react-tables/pagination',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Sorting',
  //           icon: IconPoint,
  //           href: '/react-tables/sorting',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Column Visibility',
  //           icon: IconPoint,
  //           href: '/react-tables/column-visiblity',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Editable',
  //           icon: IconPoint,
  //           href: '/react-tables/editable',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Expanding',
  //           icon: IconPoint,
  //           href: '/react-tables/expanding',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Sticky',
  //           icon: IconPoint,
  //           href: '/react-tables/sticky',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Empty',
  //           icon: IconPoint,
  //           href: '/react-tables/empty',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Drag & Drop',
  //           icon: IconPoint,
  //           href: '/react-tables/drag-drop',
  //         },
  //       ],
  //     },
  //   ],
  // },
  // {
  //   id: uniqueId(),
  //   title: 'Mui Charts',
  //   icon: IconChartHistogram,
  //   href: '/muicharts/barcharts',
  //   children: [
  //     {
  //       id: uniqueId(),
  //       title: 'BarCharts',
  //       icon: IconPoint,
  //       href: '/muicharts/barcharts',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'LineCharts',
  //       icon: IconPoint,
  //       href: '/muicharts/linecharts/line',
  //       children: [
  //         {
  //           id: uniqueId(),
  //           title: 'Lines',
  //           icon: IconPoint,
  //           href: '/muicharts/linecharts/line',
  //         },
  //         {
  //           id: uniqueId(),
  //           title: 'Area',
  //           icon: IconPoint,
  //           href: '/muicharts/linecharts/area',
  //         },
  //       ],
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'PieCharts',
  //       icon: IconPoint,
  //       href: '/muicharts/piecharts',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'ScatterCharts',
  //       icon: IconPoint,
  //       href: '/muicharts/scattercharts',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'SparklineCharts',
  //       icon: IconPoint,
  //       href: '/muicharts/sparklinecharts',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'GaugeCharts',
  //       icon: IconPoint,
  //       href: '/muicharts/gaugecharts',
  //     },
  //   ],
  // },
  // {
  //   id: uniqueId(),
  //   title: 'SimpleTreeView',
  //   icon: IconListTree,
  //   href: '/mui-trees/simpletree/simpletree-items',
  //   children: [
  //     {
  //       id: uniqueId(),
  //       title: 'Items',
  //       icon: IconPoint,
  //       href: '/mui-trees/simpletree/simpletree-items',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Selection',
  //       icon: IconPoint,
  //       href: '/mui-trees/simpletree/simpletree-selection',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Expansion',
  //       icon: IconPoint,
  //       href: '/mui-trees/simpletree/simpletree-expansion',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Customization',
  //       icon: IconPoint,
  //       href: '/mui-trees/simpletree/simpletree-customization',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Focus',
  //       icon: IconPoint,
  //       href: '/mui-trees/simpletree/simpletree-focus',
  //     },
  //   ],
  // },
];
export default Menuitems;
