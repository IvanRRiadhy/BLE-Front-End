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
    { label: "Other", value: "Other" },
  ];
  
  export const statusEmployee: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Active", value: "Active" },
    { label: "Non-Active", value: "NonActive" },
    { label: "Mutation", value: "Mutation" },
  ];
  
  export const restrictedStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Restrict", value: "restrict" },
    { label: "Non-Restrict", value: "non-restrict" },
  ];
  
  export const visitorStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Waiting", value: "Waiting" },
    { label: "Check-in", value: "Checkin" },
    { label: "Check-out", value: "Checkout" },
    { label: "Denied", value: "Denied" },
    { label: "Block", value: "Block" },
    { label: "Pre-Check-in", value: "PreCheckin" },
    { label: "Pre-Register", value: "Preregist" },
  ];
  
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
  ];

  export const actionStatus: inputDataType[] = [
    { label: "Please select Status", value: '', disabled: true},
    { label: "Idle", value: 'Idle'},
    { label: "Done", value: 'Done'},
    { label: "Cancel", value: 'Cancel'},
    { label: "Need", value: 'Need'},
    { label: "Waiting", value: 'Waiting'},
    { label: "Investigated", value: 'Investigated'},
    { label: "Done Investigated", value: 'DoneInvestigated'},
    { label: "Postpone Investigated", value: 'PostponeInvestigated'},
  ];

  export const DeviceType: inputDataType[] = [
    { label: "Please select Type", value: '', disabled: true},
    { label: "CCTV", value: 'Cctv'},
    { label: "Access Control", value: 'AccessDoor'},
    { label: "Ble Reader", value: 'BleReader'},
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
  ]
  