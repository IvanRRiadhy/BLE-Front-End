import { IconCircleDashedCheck, IconCircleDashedX, IconCircleX, IconClockCheck, IconClockRecord, IconForbid2, IconGenderFemale, IconGenderMale, IconLogin, IconLogout } from "@tabler/icons-react";

interface inputDataType {
    value: string,
    label: string,
    disabled?: boolean,
}

export const orgType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "Single", value: "Single" },
    { label: "Small", value: "Small" },
    { label: "Medium", value: "Medium" },
    { label: "Big", value: "Big" },
    { label: "Corporate", value: "Corporate" },
    { label: "Government", value: "Government" },
  ];
  
  export const appType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "Empty", value: "Empty" },
    { label: "VMS", value: "Vms" },
    { label: "SMR", value: "Smr" },
    { label: "Signage", value: "Signage" },
    { label: "Parking", value: "Parking" },
    { label: "Automation", value: "Automation" },
    { label: "Tracking", value: "Tracking" },
  ];
  
  export const licenseType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "Perpetual", value: "Perpetual" },
    { label: "Annual", value: "Annual" },
  ];

  export const visitorType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "Active", value: "Active" },
    { label: "Expired", value: "Expired" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  export const cardType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "Rfid", value: "Rfid" },
    { label: "BLE", value: "Ble" },
    { label: "RfidBLE", value: "RfidBle" },
  ];
  
  export const integrationType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "SDK", value: "Sdk" },
    { label: "API", value: "Api" },
    { label: "Other", value: "Other" },
  ];
  
  export const apiTypeAuth: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true },
    { label: "Basic", value: "Basic" },
    { label: "Bearer", value: "Bearer" },
    { label: "API key", value: "ApiKey" },
  ];
  
  export const gender: inputDataType[] = [
    { label: "Please select Gender", value: '', disabled: true},
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Rather not say", value: "RatherNotSay" },
  ];
  export const genderIconMap: Record<string, any> = {
  Male: IconGenderMale,
  Female: IconGenderFemale,
  RatherNotSay: IconCircleX, // or any icon you want for "Rather not say"
};

export const genderEnumMap: Record<string, number> = {
  Male: 0,
  Female: 1,
  RatherNotSay: 2,
}
  
  export const statusEmployee: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Active", value: "Active" },
    { label: "Non-Active", value: "NonActive" },
    { label: "Mutation", value: "Mutation" },
  ];
  
  export const restrictedStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Restrict", value: "Restrict" },
    { label: "Non-Restrict", value: "NonRestrict" },
  ];

    export const readerType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true},
    { label: "Indoor", value: "Indoor" },
    { label: "Outdoor", value: "Outdoor" },
  ];
  
  export const visitorStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Waiting", value: "Waiting" },
    { label: "Check-in", value: "Checkin" },
    { label: "Check-out", value: "Checkout" },
    { label: "Denied", value: "Denied" },
    { label: "Block", value: "Block" },
    { label: "Unblock", value: "Unblock" },
    { label: "Pre-Check-in", value: "Precheckin" },
    { label: "Pre-Register", value: "Preregist" },
  ];
  export const visitorStatusIconMap: Record<string, any> = {
    Waiting: IconClockRecord,
    Checkin: IconLogin,
    Checkout: IconLogout,
    Denied: IconCircleDashedX,
    Block: IconForbid2,
    Precheckin: IconClockCheck,
    Preregist: IconCircleDashedCheck,
  }
export const visitorStatusEnumMap: Record<string, number> = {
  Waiting: 0,
  Checkin: 1,
  Checkout: 2,
  Denied: 3,
  Block: 4,
  Unblock: 5,
  Precheckin: 6,
  Preregist: 7,
};
  
  export const alarmStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Non-Active", value: "NonActive" },
    { label: "Active", value: "Active" },
  ];

  export const alarmRecordStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Block", value: 'Block'},
    { label: "Help", value: 'Help'},
    { label: "Wrong Zone", value: 'WrongZone'},
    { label: "Expired", value: 'Expired'},
    { label: "Lost", value: 'Lost'},
    { label: "Blacklist", value: "Blacklist"},
  ];

  export const alarmRecordStatusColormap: Record<string, string> = {
    Block: 'error.dark',
    Help: 'success.main',
    WrongZone: 'error.dark',
    Expired: 'warning.main',
    Lost: 'primary.main',
    Blacklist: 'black',
  };

  export const actionStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Idle", value: 'Idle'},
    { label: "Done", value: 'Done'},
    { label: "No Action", value: 'NoAction'},
    { label: "Waiting", value: 'Waiting'},
    { label: "Investigated", value: 'Investigated'},
    { label: "Done Investigated", value: 'DoneInvestigated'},
    { label: "Postpone Investigated", value: 'PostponeInvestigated'},
  ];

  export const actionStatusColormap: Record<string, string> = {
  Idle: 'error.main',
  Done: 'success.main',
  NoAction: 'grey',
  Waiting: 'warning.main',
  Investigated: 'primary.main',
  DoneInvestigated: 'success.main',
  PostponeInvestigated: 'warning.main',
};

  export const DeviceType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true},
    // { label: "CCTV", value: 'Cctv'}, //0
    // { label: "Access Control", value: 'AccessDoor'}, //1
    { label: "Ble Reader", value: 'BleReader'}, //2
  ];

  export const DeviceStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Active", value: 'Active'},
    { label: "Non Active", value: 'NonActive'},
    { label: "Damaged", value: 'Damaged'},
    { label: "Close", value: 'Close',},
    { label: "Open", value: 'Open'},
    { label: "Monitor", value: 'Monitor'},
    { label: "Alarm", value: 'Alarm'},
  ];
  
  export const ServiceStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Start", value: 'Start'},
    { label: "Stop", value: 'Stop'},
  ];

  export const IdentityType: inputDataType[] = [
    {label: "Please select Type", value: '', disabled: true},
    {label: "KTP", value: 'KTP'},
    {label: "Passport", value: 'Passport'},
    {label: "NIK", value: 'NIK'},
        {label: "DriverLicense", value: 'DriverLicense'},
    {label: "CardAccess", value: 'CardAccess'},
    {label: "Face", value: 'Face'},
        {label: "NDA", value: 'NDA'},
    {label: "Other", value: 'Other'},
  ]

  export const ReaderType: inputDataType[] = [
    {label: "Please select Type", value: '', disabled: true},
    {label: "Outdoor", value: 'outdoor'},
    {label: "Indoor", value: 'indoor'},
  ]

  export const PersonType: inputDataType[] = [
    {label: "Please select Type", value: '', disabled: true},
    {label: "Member", value: 'member'},
    {label: "Visitor", value: 'visitor'},
    {label: "All", value: 'all'},
  ]