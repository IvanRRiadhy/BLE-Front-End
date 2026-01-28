import { PatrolAssignType, PatrolRouteType } from "src/store/apps/crud/patrolRoute"
import { TimeGroupType } from "src/store/apps/crud/timeGroup";


export type PatrolDetailPayload = {
    patrolAssignment: PatrolAssignType;
    route: PatrolRouteType;
    timeGroups: TimeGroupType[];
    nearestPatrol?: Date | null;
};