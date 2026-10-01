import { useProfile } from 'src/hooks/useProfile';

export interface MonitoringMenuItem {
  id: string;
  title: string;
  href: string;
}

export const useMonitoringMenuItems = (): MonitoringMenuItem[] => {
  const { data: profile } = useProfile();
  const canMonitoringConfig = Boolean(
    profile?.effectiveCanCreateMonitoringConfig || profile?.effectiveCanUpdateMonitoringConfig
  );

  return [
    {
      id: 'monitoring-viewer',
      title: 'Viewer',
      href: '/dashboards/monitoring/viewer',
    },
    ...(canMonitoringConfig
      ? [
          {
            id: 'monitoring-config',
            title: 'Configuration',
            href: '/dashboards/monitoring/config',
          },
        ]
      : []),
  ];
};

export default useMonitoringMenuItems;