export type SectionKey = 'areas' | 'patrol' | 'devices' | 'geofence' | 'stay' | 'over' | 'boundary';

export type VisibilityState = {
  accordionHidden: boolean;
  items: Record<string, boolean>;
};
