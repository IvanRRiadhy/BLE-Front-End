import { CCTVType, GetFilter as CCTVFilter } from './crud/accessCCTV';
import { AccessControlType, GetFilter as AccessControlFilter } from './crud/accessControl';
import { GetFilter as AlarmRecordFilter } from './crud/alarmRecordTracking';
import { GetFilter as AlarmTriggerFilter } from './crud/alarmTrigger';
import { blacklistType, GetFilter as BlacklistFilter } from './crud/blacklist';
import { bleReaderType, GetFilter as BleReaderFilter } from './crud/bleReader';
import { BrandType, GetFilter as BrandFilter } from './crud/brand';
import { BuildingType, GetFilter as BuildingFilter } from './crud/building';
import { CardType, GetFilter as CardFilter } from './crud/card';
import { DepartmentType, GetFilter as DepartmentFilter } from './crud/department';
import { DistrictType, GetFilter as DistrictFilter } from './crud/district';
import { floorType, GetFilter as FloorFilter } from './crud/floor';
import { FloorplanType, GetFilter as FloorplanFilter } from './crud/floorplan';
import { GetFilter as FloorplanDeviceFilter } from './crud/floorplanDevice';
import { IntegrationType, GetFilter as IntegrationFilter } from './crud/integration';
import { GetFilter as MaskedAreaFilter } from './crud/maskedArea';
import { memberType, GetFilter as MemberFilter } from './crud/member';
import { OrganizationType, GetFilter as OrganizationFilter } from './crud/organization';
import { GetFilter as TrackingTransFilter } from './crud/trackingTrans';
import { VisitorType, GetFilter as VisitorFilter } from './crud/visitor';
import { TrxVisitorType, GetFilter as TrxVisitorFilter } from './crud/trxVisitor';
import { CardRecordType, GetFilter as CardRecordFilter } from './crud/cardRecord';
import { TimeGroupType, GetFilter as TimeGroupFilter } from './crud/timeGroup';
import { CardAccessType, GetFilter as CardAccessFilter } from './crud/cardAccess';
import { CardGroupType, GetFilter as CardGroupFilter } from './crud/cardGroup';
import { GeoFencingAlarmType, GetFilter as GeoFenceFilter } from './alarmsetting/geofencing';
import { GetFilter as AlarmSettingFilter } from './alarmsetting/alarmSettings';

//#region AccessCCTV
export const defaultAccessCCTVForm: CCTVType = {
  id: '',
  name: '',
  rtsp: '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
  integrationId: '',
  applicationId: localStorage.getItem('applicationId') || '',
};
export const defaultAccessCCTVFilter: CCTVFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region AccessControl
export const defaultAccessControlForm: AccessControlType = {
  id: '',
  controllerBrandId: '',
  name: '',
  type: '',
  description: '',
  channel: '',
  doorId: '',
  raw: '',
  integrationId: '',
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultAccessControlFilter: AccessControlFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region AlarmRecordTracking
export const defaultAlarmRecordFilter: AlarmRecordFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'Timestamp',
  SortDir: 'desc',
  SearchValue: '',  
  filters: {
    FloorplanMaskedAreaId: [],
    ReaderId: [],
    VisitorId: [],
  },
};
//#endregion

//#region AlarmTrigger
export const defaultAlarmTriggerFilter: AlarmTriggerFilter = {
    Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'TriggerTime',
  SortDir: 'desc',
  SearchValue: '', 
  filters: {

  }
}
//endregion

//#region Blacklist
export const defaultBlaclistForm: blacklistType = {
  id: '',
  visitorId: '',
  floorplanMaskedAreaId: '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultBlaclistFilter: BlacklistFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'Visitor.Name',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    FloorplanMaskedAreaId: [],
    VisitorId: [],
  },
};
//#endregion

//#region BleReader
export const defaultBleReaderForm: bleReaderType = {
  id: '',
  brandId: '',
  name: '',
  gmac: '',
  ip: '',
  engineReaderId: '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultBleReaderFilter: BleReaderFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    BrandId: [],
    EngineReaderId: [],
  },
};
//#endregion

//#region Brand
export const defaultBrandForm: BrandType = {
  id: '',
  name: '',
  tag: '',
};

export const defaultBrandFilter: BrandFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'Name',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region Building
export const defaultBuildingForm: BuildingType = {
  id: '',
  name: '',
  image: '',
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultBuildingFilter: BuildingFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region Department
export const defaultDepartmentForm: DepartmentType = {
  id: '',
  code: '',
  name: '',
  departmentHost: '',
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultDepartmentFilter: DepartmentFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region District
export const defaultDistrictForm: DistrictType = {
  id: '',
  code: '',
  name: '',
  districtHost: '',
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};
export const defaultDistrictFilter: DistrictFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region Floor
export const defaultFloorForm: floorType = {
  id: '',
  buildingId: '',
  name: '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};
export const defaultFloorFilter: FloorFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    BuildingId: [],
  },
};
//#endregion

//#region Floorplan
export const defaultFloorplanForm: FloorplanType = {
  id: '',
  name: '',
  floorId: '',
  floorplanImage: '',
  pixelX: 0,
  pixelY: 0,
  floorX: 0,
  floorY: 0,
  meterPerPx: 0,
    engineId: 0,
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultFloorplanFilter: FloorplanFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    FloorId: [],
  },
};
//#endregion

//#region FloorplanDevice
export const defaultFloorplanDeviceFilter: FloorplanDeviceFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    FloorplanId: [],
    FloorplanMaskedAreaId: [],
  },
};
//#endregion

//#region Integration
export const defaultIntegrationForm: IntegrationType = {
  id: '',
  brandId: '',
  integrationType: '',
  apiTypeAuth: '',
  apiUrl: '',
  apiAuthUsername: '',
  apiAuthPasswd: '',
  apiKeyField: '',
  apiKeyValue: '',
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultIntegrationFilter: IntegrationFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region MaskedArea
export const defaultMaskedAreaFilter: MaskedAreaFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    FloorplanId: [],
    FloorId: [],
  },
};
//#endregion

//#region Member
export const defaultMemberForm: memberType = {
  id: '',
  personId: '',
  organizationId: '',
  departmentId: '',
  districtId: '',
  identityId: '',
  cardNumber: '',
  bleCardNumber: '',
  name: '',
  phone: '',
  email: '',
  gender: '',
  address: '',
  faceImage: '',
  uploadFr: 0,
  uploadFrError: '',
  birthDate: '',
  joinDate: '',
  exitDate: '',
  headMember1: '',
  headMember2: '',
  applicationId: localStorage.getItem('applicationId') || '',
  statusEmployee: '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultMemberFilter: MemberFilter = {
  Draw: 1,
  Start: 0,
  Length: 10,
  SortColumn: 'Name',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    OrganizationId: [],
    DepartmentId: [],
    DistrictId: [],
  },
};
//#endregion

//#region Organization
export const defaultOrganizationForm: OrganizationType = {
  id: '',
  code: '',
  name: '',
  organizationHost: '',
  applicationId: localStorage.getItem('applicationId') || '',
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};

export const defaultOrganizationFilter: OrganizationFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region TimeGroup
export const defaultTimeGroupForm: TimeGroupType = {
  id: '',
  name: 'Add Name',
  description: 'Add Description',
  timeBlocks: [], 
};

export const defaultTimeGroupFilter: TimeGroupFilter = {
    Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'name',
  SortDir: 'asc',
  SearchValue: '',
}
//#endregion

//#region TrackingTransaction
export const defaultTrackingTransFilter: TrackingTransFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'TransTime',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    FloorplanMaskedAreaId: [],
    ReaderId: [],
  },
};
//#endregion

//#region TrxVisitor
export const defaultTrxVisitorFilter: TrxVisitorFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  dateFilters: {
    VisitorPeriodStart:{
      DateFrom: null,
      DateTo: null,
    }
  },
  filters: {},
};
//#endregion

//#region Visitor
export const defaultVisitorForm: VisitorType = {
  id: '',
  identityId: '',
  identityType: '',
  name: '',
  personId: '',
  cardNumber: '',
  bleCardNumber: '',
  visitorType: '',
  phone: '',
  email: '',
  gender: 'Male',
  address: '',
  organizationName: '',
  districtName: '',
  departmentName: '',
  isVip: false,
  isEmailVerified: false,
  emailVerificationSendAt: '',
  emailVerificationToken: '',
  visitorPeriodStart: '',
  visitorPeriodEnd: '',
  isEmployee: false,
  faceImage: '',
  applicationId: localStorage.getItem('applicationId') || '',
};

export const defaultVisitorFilter: VisitorFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'name',
  SortDir: 'desc',
  SearchValue: '',
};
//#endregion

//#region Card
export const defaultCardForm: CardType = {
  id: '',
  name: '',
  remarks: '',
  cardType: '',
  cardNumber: '',
  cardBarcode: '',
  dmac: '',
  isMultiMaskedArea: false,
  registeredMaskedAreaId: '',
  lastUsed: '',
  statusCard: false,
  isUsed: false,
};

export const defaultCardFilter: CardFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
  },
};
//#endregion

//#region Card Record
export const defaultCardRecordFilter: CardRecordFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
  },
}
//#endregion

//#region Card Access
export const defaultCardAccessFilter: CardAccessFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'name',
  SortDir: 'asc',
  SearchValue: '',
  filters: {
  },
}

export const defaultCardAccessForm: CardAccessType = {
  id: '',
  name: '',
  accessNumber: '',
  remarks: '',
  maskedAreaIds: [],
  maskedArea: [],
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
}

//#endregion

//#region Card Group
export const defaultCardGroupForm: CardGroupType = {
  id: '',
  name: '',
  remarks: '',
  accessScope: 'specific',
  cards: [],
  cardAccesses: [],
  createdBy: '',
  createdAt: '',
  updatedBy: '',
  updatedAt: '',
};
export const defaultCardGroupFilter: CardGroupFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
  filters: {
    
  }
};
//#endregion

//#region Alarm Setting
export const defaultAlarmSettingFilter: AlarmSettingFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'name',
  SortDir: 'asc',
  SearchValue: '',
}
//#endregion

//#region GeoFence
export const defaultGeoFencingForm: GeoFencingAlarmType = {
  id: `GeoFence-${new Date().getTime()}`,
  name: '',
  remarks: '',
  areaShape: '',
  color: '#f55549',
  behavior: '',
  isActive: true,
  floorplanId: ''
};

export const defaultGeoFencingFilter: GeoFenceFilter = {
  Draw: 1,
  Start: 0,
  Length: 5,
  SortColumn: 'UpdatedAt',
  SortDir: 'desc',
  SearchValue: '',
}

//#endregion
