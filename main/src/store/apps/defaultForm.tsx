import { CCTVType } from "./crud/accessCCTV";
import { AccessControlType } from "./crud/accessControl";
import { blacklistType } from "./crud/blacklist";
import { bleReaderType } from "./crud/bleReader";
import { BrandType } from "./crud/brand";
import { BuildingType } from "./crud/building";
import { CardType } from "./crud/card";
import { DepartmentType } from "./crud/department";
import { DistrictType } from "./crud/district";
import { floorType } from "./crud/floor";
import { FloorplanType } from "./crud/floorplan";
import { IntegrationType } from "./crud/integration";
import { memberType } from "./crud/member";
import { OrganizationType } from "./crud/organization";
import { VisitorType } from "./crud/visitor";

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
}

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
}

export const defaultBlaclistForm: blacklistType = {
    id: '',
    visitorId: '',
    floorplanMaskedAreaId: '',
          createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
}

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
}

export const defaultBrandForm: BrandType = {
    id: '', 
    name: '', 
    tag: '' 
}

export const defaultBuildingForm: BuildingType = {
          id: '',
      name: '',
      image: '',
      applicationId: localStorage.getItem('applicationId') || '',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
}

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
}

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
}

export const defaultFloorForm: floorType = {
        id:  '',
    buildingId:  '',
    name:  '',
    floorImage:'',
    pixelX:  0,
    pixelY:  0,
    floorX:  0,
    floorY:  0,
    meterPerPx:  0,
    engineFloorId: 0,
    createdBy:  '',
    createdAt:  '',
    updatedBy:  '',
    updatedAt:  '',
}

export const defaultFloorplanForm: FloorplanType = {
        id: '',
    name: '',
    floorId:  '',
    applicationId:  localStorage.getItem('applicationId') || '',
    createdBy:  '',
    createdAt:  '',
    updatedBy:  '',
    updatedAt: '',
}

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
}

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
}

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
}

export const defaultVisitorForm: VisitorType = {
  id: '',
  identityId: '',
  name: '',
  personId: '',
  cardNumber: '',
  bleCardNumber: '',
  visitorType: '',
  phone: '',
  email: '',
  gender: 'male',
  address: '',
  organizationId: '',
  districtId: '',
  departmentId: '',
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

export const defaultCardForm: CardType = {
        id:  '',
        name:  '',
        remarks:  '',
        cardType:  '',
        cardNumber:  '',
        cardBarcode:  '',
        dmac: '',
        isMultiArea: false,
        registeredArea:  [],
        lastUsed: '',
        statusCard: false,
        isUsed: false,
}