import { uniqueId } from 'lodash';

const Menuitems= [
    {
        id: uniqueId(),
        title: 'Viewer',
        href: '/dashboards/monitoring/viewer',

    },
    {
        id: uniqueId(),
        title: 'Configuration',
        href: '/dashboards/monitoring/config',
    },
]

export default Menuitems;