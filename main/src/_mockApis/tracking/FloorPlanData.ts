import mock from '../mock';

import apartmentFloorPlan from '/src/assets/images/masters/Floorplan/apartment-floorplan.png';
import sampleFloorPlan from '/src/assets/images/masters/Floorplan/sample-floorplan.png';
import libraryFloorPlan from '/src/assets/images/masters/Floorplan/library-floorplan.png';

interface floorplanType {
    id: string;
    name: string;
    gateways?: string[];
    color: string;
    imagesrc: string
}

const FloorplanData: floorplanType[] = [
    {
        id: '1',
        name: 'Floor 1',
        gateways: ['0bbd9447-2e2e-4faf-bd7f-5e0c550b936c', '85a47a83-5431-4150-a3b5-6e59336431b3', 'a4378213-e7a8-4574-a682-c12f245beefc'],
        color: 'success',
        imagesrc: apartmentFloorPlan
    },
    {
        id: '2',
        name: 'Floor 2',
        gateways: ['f0b64d91-a8d5-45e4-bca0-e82e38ad04c7', 'e5523bb2-64ea-4b55-a2f9-ed769777064e'],
        color: 'warning',
        imagesrc: sampleFloorPlan
    },
    {
        id: '3',
        name: 'Floor 3',
        gateways: ['0bbd9447-2e2e-4faf-bd7f-5e0c550b936c', 'e5523bb2-64ea-4b55-a2f9-ed769777064e'],
        color: 'error',
        imagesrc: libraryFloorPlan
    }
];


mock.onGet('/api/data/tracking/FloorPlanData').reply(() => {
    return [200, FloorplanData];
});
export default FloorplanData;