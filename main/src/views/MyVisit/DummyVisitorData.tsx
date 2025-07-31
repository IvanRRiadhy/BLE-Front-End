export type trackingDataType = {
  visitorId: string;
  time: string;
  area: string;
  floor: string;
  building: string;
  isAlarm: boolean;
  id: string;
};

export type invitationDataType = {
  visitorId: string;
  time: string;
  area: string;
  floor: string;
  building: string;
  invitorId: string;
  duration: number;
  id: string;
}

export type visitorDataType = {
  id: string;
  name: string;
  organization: string;
  department: string;
  district: string;
  phone: string;
  email: string;
  address: string;
  bleCardNumber: string;
};

export const visitorData: visitorDataType[] = 
[
    {
  id: '123456',
  name: 'Bambang Pamungkas',
  organization: 'Organization 1',
  department: 'Department 1',
  district: 'District 1',
  phone: '1234567890',
  email: 'nYrKU@example.com',
  address: '123 Main St, Anytown, USA',
  bleCardNumber: '1234567890',
},
{
  id: '098765',
  name: 'Budi Dermawan',
  organization: 'Organization 2',
  department: 'Department 2',
  district: 'District 1',
  phone: '1234567890',
  email: 'nYrKU@example.com',
  address: '123 Main St, Anytown, USA',
  bleCardNumber: '1234567890',
},
{
    id: '124159',
    name: 'Siti Nurjannah',
    organization: 'Organization 3',
    department: 'Department 1',
    district: 'District 2',
    phone: '1234567890',
    email: 'nYrKU@example.com',
    address: '123 Main St, Anytown, USA',
    bleCardNumber: '1234567890',
}
];


