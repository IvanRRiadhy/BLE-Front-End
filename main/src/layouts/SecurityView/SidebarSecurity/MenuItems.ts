import { uniqueId } from 'lodash';

interface MenuitemsType {
  [x: string]: any;
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
import {
  IconPoint,
  IconHome,
  IconDeviceDesktopAnalytics,
  IconMap,
  IconBuilding,
  IconAccessible,
  IconBellExclamation,
  IconLicense,
  IconBarrierBlock,
  IconLiveView,
  IconAccessibleOff,
  IconMapDown,
  IconCropLandscape,
  IconDevices,
  IconDeviceCctv,
  IconIdBadge,
  IconDeviceIpad,
  IconBadgeTm,
  IconPlane,
  IconSend,
} from '@tabler/icons-react';

const Menuitems: MenuitemsType[] = [    
  {
        navlabel: true,
        subheader: 'My Visit',
    },
    {
        id: uniqueId(),
        title: 'Home',
        icon: IconHome,
        href: '/my-visit',
    },

    {
        navlabel: true,
        subheader: 'Apps',
    },
    {
      id: uniqueId(),
      title: 'Invite',
      icon: IconSend,
      href: '/my-visit/invite',
    }
  ];

export default Menuitems;
